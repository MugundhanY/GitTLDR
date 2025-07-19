import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { triggerNotification, NotificationTemplates } from '@/lib/notifications';

const prisma = new PrismaClient();

// Get access requests for a repository (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: repositoryId } = await params;

    // Check if user owns the repository
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id
      }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Get all access requests for this repository
    const accessRequests = await prisma.repositoryAccessRequest.findMany({
      where: {
        repositoryId: repositoryId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ accessRequests });
  } catch (error) {
    console.error('Error fetching access requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Approve or deny access request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: repositoryId } = await params;
    const { requestId, action } = await request.json(); // action: 'APPROVED' | 'DENIED'

    if (!requestId || !action || !['APPROVED', 'DENIED'].includes(action)) {
      return NextResponse.json({ error: 'Request ID and valid action are required' }, { status: 400 });
    }

    // Check if user owns the repository
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id
      }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Get the access request
    const accessRequest = await prisma.repositoryAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!accessRequest || accessRequest.repositoryId !== repositoryId) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 });
    }

    if (accessRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Access request has already been reviewed' }, { status: 400 });
    }

    // Update the request status
    const updatedRequest = await prisma.repositoryAccessRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        reviewedAt: new Date(),
        reviewedBy: user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    // If approved, create repository share setting
    if (action === 'APPROVED') {
      await prisma.repositoryShareSetting.create({
        data: {
          repositoryId: repositoryId,
          userId: accessRequest.userId
        }
      });
    }

    // Create notification for the requester
    const requesterName = (user as any).name || (user as any).githubLogin || user.email;
    
    try {
      let notification;
      if (action === 'APPROVED') {
        notification = NotificationTemplates.ACCESS_REQUEST_APPROVED(
          repository.name,
          repositoryId,
          requesterName
        );
      } else {
        notification = NotificationTemplates.ACCESS_REQUEST_DENIED(
          repository.name,
          requesterName
        );
      }
      
      await triggerNotification({
        userId: accessRequest.userId,
        ...notification
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
      accessRequest: updatedRequest,
      action: action
    });
  } catch (error) {
    console.error('Error reviewing access request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
