import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/repositories/[id]/public-info - Get public repository information for sharing page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: repositoryId } = await params;

    // Get repository basic info (no authentication required for public sharing)
    const repository = await prisma.repository.findUnique({
      where: {
        id: repositoryId
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
        _count: {
          select: {
            files: true
          }
        }
      }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Return only public information
    return NextResponse.json({
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        description: repository.description,
        owner: repository.user,
        language: repository.language,
        createdAt: repository.createdAt.toISOString(),
        updatedAt: repository.updatedAt.toISOString(),
        fileCount: repository._count.files
      }
    });
  } catch (error) {
    console.error('Error fetching public repository info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
