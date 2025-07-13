import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

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

    // First check if user owns the repository
    let repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id
      },
      include: {
        files: true,
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

    let permission = 'OWNER';
    
    // If not owned, check if it's shared with the user
    if (!repository) {
      const shareSettings = await prisma.repositoryShareSetting.findFirst({
        where: {
          repositoryId: repositoryId,
          userId: user.id
        },
        include: {
          repository: {
            include: {
              files: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      if (shareSettings) {
        repository = shareSettings.repository;
        permission = shareSettings.permission;
      }
    }

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
    }

    // Transform the repository data
    const transformedRepository = {
      id: repository.id,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      url: repository.url,
      description: repository.description,
      language: repository.language,
      stars: repository.stars,
      forks: repository.forks,
      isPrivate: repository.isPrivate,
      processed: repository.processed,
      status: repository.embeddingStatus,
      summary: repository.summary,
      fileCount: repository.files.length,
      avatarUrl: repository.avatarUrl,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
      files: repository.files,
      user: repository.user,
      permission: permission,
      isShared: permission !== 'OWNER'
    };

    return NextResponse.json({ repository: transformedRepository });
  } catch (error) {
    console.error('Error fetching repository:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
