import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getBestAvatarURL, extractGitHubUsername } from '@/lib/avatars';

const prisma = new PrismaClient();

// GET /api/dashboard/stats - Get dashboard statistics for a repository
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID is required' },
        { status: 400 }
      );
    }

    // Get repository with GitHub data
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id,
      },
      include: {
        files: {
          select: {
            id: true,
            language: true,
            size: true,
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
            summary: true,
            status: true,
            filesChanged: true,
            createdAt: true,
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

    // Fetch additional GitHub data if we have a URL
    let githubStats = null;
    if (repository.url) {
      try {
        const urlMatch = repository.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (urlMatch) {
          const [, owner, repo] = urlMatch;
          
          // Fetch repository data from GitHub
          const githubResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
              headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'GitTLDR',
                ...(process.env.GITHUB_TOKEN && {
                  'Authorization': `token ${process.env.GITHUB_TOKEN}`
                })
              },
            }
          );

          if (githubResponse.ok) {
            const repoData = await githubResponse.json();
            
            // Fetch pull requests
            const prResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/pulls?state=open`,
              {
                headers: {
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'GitTLDR',
                  ...(process.env.GITHUB_TOKEN && {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`
                  })
                },
              }
            );

            // Fetch contributors
            const contributorsResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contributors`,
              {
                headers: {
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'GitTLDR',
                  ...(process.env.GITHUB_TOKEN && {
                    'Authorization': `token ${process.env.GITHUB_TOKEN}`
                  })
                },
              }
            );

            const pullRequests = prResponse.ok ? await prResponse.json() : [];
            const contributors = contributorsResponse.ok ? await contributorsResponse.json() : [];

            githubStats = {
              stars: repoData.stargazers_count || 0,
              forks: repoData.forks || 0,
              openIssues: repoData.open_issues_count || 0,
              pullRequests: pullRequests.length || 0,
              contributors: contributors.length || 0,
              size: repoData.size || 0,
              language: repoData.language,
              topics: repoData.topics || [],
              lastPush: repoData.pushed_at,
              watchers: repoData.watchers_count || 0
            };
          }
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stats:', error);
      }
    }

    // Calculate local statistics
    const totalFiles = repository.files.length;
    const totalSize = repository.files.reduce((sum, file) => sum + (file.size || 0), 0);    // Recent activity from commits with enhanced avatar generation
    const recentActivity = repository.commits.map(commit => {
      const messageLines = commit.message?.split('\n') || [];
      const title = messageLines[0]?.substring(0, 60) + (messageLines[0]?.length > 60 ? '...' : '') || `Commit ${commit.sha.substring(0, 8)}`;
        // Extract GitHub username and generate best avatar
      const githubUsername = extractGitHubUsername(commit.authorEmail, commit.authorName);
      const avatarUrl = getBestAvatarURL(
        commit.authorName || 'Unknown',
        commit.authorEmail,
        githubUsername || undefined,
        commit.authorAvatar ?? undefined,
        40
      );

      // Enhanced description with better formatting
      let description = '';
      if (commit.summary) {
        description = commit.summary.length > 100 
          ? commit.summary.substring(0, 100) + '...' 
          : commit.summary;
      } else {
        switch (commit.status) {
          case 'COMPLETED':
            description = '✨ AI summary ready';
            break;
          case 'PROCESSING':
            description = '🔄 Generating AI summary...';
            break;
          case 'FAILED':
            description = '❌ Summary generation failed';
            break;
          default:
            description = `📝 ${commit.filesChanged || 0} files changed`;
        }
      }

      return {
        id: commit.id,
        type: 'commit' as const,
        title,
        author: commit.authorName || 'Unknown',
        email: commit.authorEmail,
        time: formatRelativeTime(commit.timestamp || commit.createdAt),
        avatar: avatarUrl,
        description,
        sha: commit.sha.substring(0, 8),
        filesChanged: commit.filesChanged || 0,
        hasAiSummary: !!commit.summary,
        summaryStatus: commit.status,
        githubUsername
      };
    });

    // Add some mock activity if no commits
    const finalActivity = recentActivity.length > 0 ? recentActivity : [
      {
        id: 'mock-1',
        type: 'commit' as const,
        title: 'Repository added to GitTLDR',
        author: 'System',
        time: formatRelativeTime(repository.createdAt),
        avatar: 'SY',
        description: 'Repository successfully integrated for AI analysis'
      }
    ];    // Dashboard stats combining GitHub and local data (for display only)
    const stats = [
      {
        name: 'Stars',
        value: githubStats?.stars || repository.stars || 0,
        icon: 'StarIcon',
        change: '+0', // We don't track historical data yet
        changeType: 'neutral',
        trend: 'stable'
      },
      {
        name: 'Issues',
        value: githubStats?.openIssues || 0,
        icon: 'ExclamationTriangleIcon',
        change: '+0',
        changeType: 'neutral',
        trend: 'stable'
      },
      {
        name: 'Pull Requests',
        value: githubStats?.pullRequests || 0,
        icon: 'CodeBracketIcon',
        change: '+0',
        changeType: 'neutral',
        trend: 'stable'
      },
      {
        name: 'Contributors',
        value: githubStats?.contributors || 1,
        icon: 'UsersIcon',
        change: '+0',
        changeType: 'neutral',
        trend: 'stable'
      }
    ];

    // Repository insights
    const insights = {
      size: githubStats?.size ? formatBytes(githubStats.size * 1024) : formatBytes(totalSize),
      forks: githubStats?.forks || repository.forks || 0,
      watchers: githubStats?.watchers || githubStats?.stars || 0,
      files: totalFiles,
      lastActivity: githubStats?.lastPush ? formatRelativeTime(new Date(githubStats.lastPush)) : 'Unknown',
      language: githubStats?.language || repository.language || 'Unknown',
      topics: githubStats?.topics || []
    };

    await prisma.$disconnect();    return NextResponse.json({
      stats,
      recentActivity: finalActivity,
      insights,
      repository: {
        id: repository.id,
        name: repository.name,
        description: repository.description,
        url: repository.url,
        processed: repository.processed,
        embeddingStatus: repository.embeddingStatus
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

// Helper function to format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 30) {
    return `${diffDays}d ago`;
  } else {
    return then.toLocaleDateString();
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
