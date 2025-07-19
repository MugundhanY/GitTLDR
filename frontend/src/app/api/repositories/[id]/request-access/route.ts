import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { triggerNotification, NotificationTemplates } from '@/lib/notifications';

const prisma = new PrismaClient();

// Request access to a repository via URL
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
    const { message } = await request.json();

    // Check if repository exists
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
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

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Check if user already has access
    const existingAccess = await prisma.repositoryShareSetting.findUnique({
      where: {
        repositoryId_userId: {
          repositoryId: repositoryId,
          userId: user.id
        }
      }
    });

    if (existingAccess || repository.userId === user.id) {
      return NextResponse.json({ error: 'You already have access to this repository' }, { status: 400 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.repositoryAccessRequest.findUnique({
      where: {
        repositoryId_userId: {
          repositoryId: repositoryId,
          userId: user.id
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'You already have a pending request for this repository',
        status: existingRequest.status
      }, { status: 400 });
    }

    // Create access request
    const accessRequest = await prisma.repositoryAccessRequest.create({
      data: {
        repositoryId: repositoryId,
        userId: user.id,
        message: message || '',
        status: 'PENDING'
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

    // Create notification for repository owner
    const userName = (user as any).name || (user as any).githubLogin || user.email;
    
    try {
      const notification = NotificationTemplates.ACCESS_REQUEST_RECEIVED(
        userName,
        repository.name,
        repositoryId,
        user.id
      );
      
      await triggerNotification({
        userId: repository.userId,
        ...notification
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ 
      accessRequest: {
        id: accessRequest.id,
        status: accessRequest.status,
        createdAt: accessRequest.createdAt,
        repository: {
          id: repository.id,
          name: repository.name,
          owner: repository.user.name
        }
      }
    });
  } catch (error) {
    console.error('Error creating access request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get repository information for URL sharing (public info only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: repositoryId } = await params;

    // Get basic repository information (no auth required for public info)
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: {
        id: true,
        name: true,
        fullName: true,
        description: true,
        language: true,
        stars: true,
        forks: true,
        isPrivate: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Check if user is logged in and already has access
    const user = await getUserFromRequest(request);
    let userAccess = null;

    if (user) {
      // Check if user owns repository
      if (repository.user.id === user.id) {
        userAccess = { type: 'OWNER' };
      } else {
        // Check if user has team access
        const shareSettings = await prisma.repositoryShareSetting.findUnique({
          where: {
            repositoryId_userId: {
              repositoryId: repositoryId,
              userId: user.id
            }
          }
        });

        if (shareSettings) {
          userAccess = { type: 'MEMBER' };
        } else {
          // Check if user has pending request
          const accessRequest = await prisma.repositoryAccessRequest.findUnique({
            where: {
              repositoryId_userId: {
                repositoryId: repositoryId,
                userId: user.id
              }
            }
          });

          if (accessRequest) {
            userAccess = { 
              type: 'PENDING_REQUEST',
              status: accessRequest.status,
              requestedAt: accessRequest.createdAt
            };
          }
        }
      }
    }

    return NextResponse.json({ 
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        description: repository.description,
        language: repository.language,
        stars: repository.stars,
        forks: repository.forks,
        isPrivate: repository.isPrivate,
        createdAt: repository.createdAt,
        owner: repository.user
      },
      userAccess
    });
  } catch (error) {
    console.error('Error fetching repository info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
