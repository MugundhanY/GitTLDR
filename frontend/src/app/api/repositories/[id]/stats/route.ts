import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { checkRepositoryAccess } from '@/lib/repository-access';

const prisma = new PrismaClient();

// GET /api/repositories/[id]/stats - Get detailed repository statistics
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

    // Get repository info from database
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
      },
      include: {
        files: {
          select: {
            id: true,
            size: true,
            language: true,
          }
        },
        questions: {
          select: {
            id: true,
          }
        },
        meetings: {
          select: {
            id: true,
            title: true,
            created_at: true,
            status: true,
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 10
        }
      }
    });

    if (!repository) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }    // Calculate statistics
    const totalFiles = repository.files.length;
    const totalQuestions = repository.questions.length;
    const totalSize = repository.files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    // Language distribution
    const languageStats: Record<string, number> = {};
    repository.files.forEach(file => {
      if (file.language) {
        languageStats[file.language] = (languageStats[file.language] || 0) + 1;
      }
    });

    // Calculate language percentages
    const languages = Object.entries(languageStats).map(([lang, count]) => ({
      name: lang,
      count,
      percentage: Math.round((count / totalFiles) * 100)
    })).sort((a, b) => b.count - a.count);

    // Recent activity from meetings
    const recentActivity = repository.meetings.map(meeting => ({
      id: meeting.id,
      type: 'meeting' as const,
      title: meeting.title,
      description: meeting.status === 'COMPLETED' ? 'Meeting analyzed' : 
                   meeting.status === 'PROCESSING' ? 'Processing...' : 
                   'Meeting scheduled',
      timestamp: meeting.created_at?.toISOString() || new Date().toISOString(),
      status: meeting.status
    }));

    const stats = {
      totalFiles,
      totalQuestions,
      totalSize,
      languages,
      recentActivity,
      meetingCount: repository.meetings.length,
      processed: repository.processed,
      embeddingStatus: repository.embeddingStatus
    };

    await prisma.$disconnect();
    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching repository stats:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to fetch repository stats' },
      { status: 500 }
    );
  }
}