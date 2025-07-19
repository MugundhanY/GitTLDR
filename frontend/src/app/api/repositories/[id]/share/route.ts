import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { checkRepositoryManagementAccess } from '@/lib/repository-access';
import { triggerNotification, NotificationTemplates } from '@/lib/notifications';

const prisma = new PrismaClient();

// Get repository share settings
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

    // Check if user can manage sharing (only owners)
    const canManageSharing = await checkRepositoryManagementAccess(repositoryId, user.id);

    if (!canManageSharing) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Get current share settings
    const shareSettings = await prisma.repositoryShareSetting.findMany({
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
        }
      }
    });

    return NextResponse.json({ shareSettings });
  } catch (error) {
    console.error('Error fetching repository share settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Share repository with user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: repositoryId } = await params;
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user owns the repository (only owners can share)
    const canManageSharing = await checkRepositoryManagementAccess(repositoryId, user.id);

    if (!canManageSharing) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already shared
    const existingShare = await prisma.repositoryShareSetting.findUnique({
      where: {
        repositoryId_userId: {
          repositoryId: repositoryId,
          userId: targetUser.id
        }
      }
    });

    if (existingShare) {
      return NextResponse.json({ error: 'Repository already shared with this user' }, { status: 400 });
    }

    // Create share setting (all members have full access)
    const shareSetting = await prisma.repositoryShareSetting.create({
      data: {
        repositoryId: repositoryId,
        userId: targetUser.id
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
        repository: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Get current user info for notification
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true }
    });

    // Send notification to the user who was shared the repository
    try {
      const notification = NotificationTemplates.REPOSITORY_SHARED(
        shareSetting.repository.name,
        currentUser?.name || user.email || 'Someone',
        repositoryId
      );
      
      await triggerNotification({
        userId: targetUser.id,
        ...notification
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the sharing if notification fails
    }

    return NextResponse.json({ shareSetting });
  } catch (error) {
    console.error('Error sharing repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove repository share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: repositoryId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user owns the repository (only owners can manage shares)
    const canManageSharing = await checkRepositoryManagementAccess(repositoryId, user.id);

    if (!canManageSharing) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Remove share setting
    await prisma.repositoryShareSetting.delete({
      where: {
        repositoryId_userId: {
          repositoryId: repositoryId,
          userId: targetUserId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing repository share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
