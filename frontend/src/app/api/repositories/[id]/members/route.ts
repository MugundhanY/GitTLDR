import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { checkRepositoryAccess } from '@/lib/repository-access';

const prisma = new PrismaClient();

// Get repository members (team members with access)
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

    // Check repository access
    const accessResult = await checkRepositoryAccess(repositoryId, user.id);
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    const repository = accessResult.repository;
    const userRole = accessResult.isOwner ? 'OWNER' : 'MEMBER';

    // Get all team members with access to this repository
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
            avatarUrl: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the team members data
    const members = shareSettings.map(setting => ({
      id: setting.user.id,
      name: setting.user.name,
      email: setting.user.email,
      avatarUrl: setting.user.avatarUrl,
      role: 'MEMBER', // All team members have the same access level
      joinedAt: setting.createdAt,
      status: 'ACTIVE'
    }));

    // Add the owner as the first member
    if (repository) {
      members.unshift({
        id: repository.user.id,
        name: repository.user.name,
        email: repository.user.email,
        avatarUrl: repository.user.avatarUrl,
        role: 'OWNER',
        joinedAt: repository.createdAt,
        status: 'ACTIVE'
      });
    }

    return NextResponse.json({ 
      members,
      totalCount: members.length,
      userRole
    });
  } catch (error) {
    console.error('Error fetching repository members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove member from repository
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
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Check if user has management access (only owners can manage members)
    const accessResult = await checkRepositoryAccess(repositoryId, user.id);
    if (!accessResult.hasAccess || !accessResult.isOwner) {
      return NextResponse.json({ error: 'Permission denied - only repository owners can manage members' }, { status: 403 });
    }

    // Remove member from repository
    await prisma.repositoryShareSetting.delete({
      where: {
        repositoryId_userId: {
          repositoryId: repositoryId,
          userId: memberId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
