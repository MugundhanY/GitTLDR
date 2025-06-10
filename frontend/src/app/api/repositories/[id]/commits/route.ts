import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/repositories/[id]/commits - Get commit history for a repository
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '15'), 50); // Max 50 per page

    // Get repository info from database to get GitHub URL
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id,
      },
    });

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    // Extract owner and repo from GitHub URL
    const urlMatch = repository.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Invalid repository URL' },
        { status: 400 }
      );
    }

    const [, owner, repo] = urlMatch;

    // Fetch commits from GitHub API
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitTLDR',
          // Add GitHub token if available for higher rate limits
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
        },
      }
    );

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found or is private' },
          { status: 404 }
        );
      }
      throw new Error(`GitHub API error: ${githubResponse.status}`);
    }

    const commits = await githubResponse.json();

    // Get detailed commit info for each commit (including stats)
    const detailedCommits = await Promise.all(
      commits.map(async (commit: any) => {
        try {
          const detailResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
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

          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            return {
              sha: commit.sha,
              message: commit.commit.message,
              author: commit.commit.author,
              html_url: commit.html_url,
              stats: detail.stats,
            };
          }
        } catch (error) {
          console.error(`Error fetching details for commit ${commit.sha}:`, error);
        }

        // Fallback to basic commit info
        return {
          sha: commit.sha,
          message: commit.commit.message,
          author: commit.commit.author,
          html_url: commit.html_url,
        };
      })
    );

    await prisma.$disconnect();

    return NextResponse.json({
      commits: detailedCommits,
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        owner: repository.owner,
      },
    });

  } catch (error) {
    console.error('Error fetching commits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch commits' },
      { status: 500 }
    );
  }
}
