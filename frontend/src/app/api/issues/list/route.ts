import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req, true);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const repositoryId = searchParams.get('repositoryId');
    
    if (!repositoryId) {
      return NextResponse.json({ error: 'repositoryId required' }, { status: 400 });
    }
    
    // Get repository info
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { fullName: true, userId: true }
    });
    
    if (!repository || repository.userId !== user.id) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    
    // Get user's GitHub token
    if (!user.githubAccessToken) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }
    
    // Fetch issues from GitHub
    const [owner, repo] = repository.fullName.split('/');
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=50`,
      {
        headers: {
          'Authorization': `token ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch GitHub issues');
    }
    
    const issues = await response.json();
    
    // Filter out pull requests (GitHub API returns them as issues)
    const actualIssues = issues.filter((issue: any) => !issue.pull_request);
    
    return NextResponse.json({ issues: actualIssues });
    
  } catch (error) {
    console.error('Error fetching issues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
