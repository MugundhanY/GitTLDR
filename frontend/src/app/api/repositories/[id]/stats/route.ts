import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

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

    // Get repository info from database
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id,
      },
      include: {
        files: {
          select: {
            id: true,
            size: true,
            language: true,
          }
        },        commits: {
          select: {
            id: true,
            sha: true,
            message: true,
            authorName: true,
            authorEmail: true,
            authorAvatar: true,
            timestamp: true,
            status: true,
            filesChanged: true,
            summary: true,
          },
          orderBy: {
            timestamp: 'desc'
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
    }

    // Calculate statistics
    const totalFiles = repository.files.length;
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
    })).sort((a, b) => b.count - a.count);    // Recent activity from commits with enhanced data
    const recentActivity = repository.commits.map(commit => {
      const messageLines = commit.message?.split('\n') || [];
      const title = messageLines[0]?.substring(0, 50) + (messageLines[0]?.length > 50 ? '...' : '') || `Commit ${commit.sha.substring(0, 8)}`;
      
      // Generate avatar URL
      const avatarUrl = commit.authorAvatar || 
        `https://github.com/${commit.authorEmail?.split('@')[0] || 'user'}.png?size=32` ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(commit.authorName || 'Unknown')}&size=32&background=6366f1&color=fff`;

      return {
        id: commit.id,
        type: 'commit' as const,
        title,
        description: commit.summary || 
          (commit.status === 'COMPLETED' ? 'AI summary available' : 
           commit.status === 'PROCESSING' ? 'Generating...' : 
           `${commit.filesChanged || 0} files changed`),
        timestamp: commit.timestamp?.toISOString() || new Date().toISOString(),
        author: commit.authorName || 'Unknown',
        email: commit.authorEmail,
        avatar: avatarUrl,
        sha: commit.sha.substring(0, 8),
        filesChanged: commit.filesChanged || 0,
        hasAiSummary: !!commit.summary,
        summaryStatus: commit.status
      };
    });

    const stats = {
      totalFiles,
      totalSize,
      languages,
      recentActivity,
      commitCount: repository.commits.length,
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