import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Get all repositories shared with the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get repositories shared with this user
    const sharedRepositories = await prisma.repositoryShareSetting.findMany({
      where: {
        userId: user.id
      },
      include: {
        repository: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            _count: {
              select: {
                files: true,
                meetings: true,
                questions: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ 
      sharedRepositories: sharedRepositories.map(share => ({
        id: share.repository.id,
        name: share.repository.name,
        fullName: share.repository.fullName,
        description: share.repository.description,
        owner: share.repository.user,
        sharedAt: share.createdAt,
        stats: {
          files: share.repository._count.files,
          meetings: share.repository._count.meetings,
          questions: share.repository._count.questions
        }
      }))
    });
  } catch (error) {
    console.error('Error fetching shared repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
