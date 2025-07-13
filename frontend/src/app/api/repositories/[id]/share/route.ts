import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

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
    const { email, permission = 'VIEW' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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

    // Create share setting
    const shareSetting = await prisma.repositoryShareSetting.create({
      data: {
        repositoryId: repositoryId,
        userId: targetUser.id,
        permission: permission
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

    return NextResponse.json({ shareSetting });
  } catch (error) {
    console.error('Error sharing repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update share permission
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
    const { userId: targetUserId, permission } = await request.json();

    if (!targetUserId || !permission) {
      return NextResponse.json({ error: 'User ID and permission are required' }, { status: 400 });
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

    // Update share setting
    const updatedShare = await prisma.repositoryShareSetting.update({
      where: {
        repositoryId_userId: {
          repositoryId: repositoryId,
          userId: targetUserId
        }
      },
      data: {
        permission: permission
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

    return NextResponse.json({ shareSetting: updatedShare });
  } catch (error) {
    console.error('Error updating repository share permission:', error);
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
