import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

// POST /api/repositories/commits/summarize - Generate AI summary for a commit
export async function POST(request: NextRequest) {  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { repositoryId, commitSha, commitData } = body;

    if (!repositoryId || !commitSha || !commitData) {
      return NextResponse.json(
        { error: 'Repository ID, commit SHA, and commit data are required' },
        { status: 400 }
      );
    }

    // Verify repository ownership
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const repository = await prisma.repository.findFirst({      where: {
        id: repositoryId,
        userId: user.id,
      },
    });

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }    // Check if summary already exists
    const existingCommit = await prisma.commit.findFirst({
      where: {
        repositoryId,
        sha: commitSha,
      },
    });

    if (existingCommit?.summary && existingCommit.status === 'COMPLETED') {
      await prisma.$disconnect();
      return NextResponse.json({
        commit_id: existingCommit.id,
        commit_sha: commitSha,
        summary: existingCommit.summary,
        status: existingCommit.status,
        generated_at: existingCommit.updatedAt.toISOString(),
      });
    }

    // Get detailed commit info from GitHub API for changes
    const urlMatch = repository.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Invalid repository URL' },
        { status: 400 }
      );
    }

    const [, owner, repo] = urlMatch;
    
    // Fetch detailed commit with changes
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`,
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

    if (!githubResponse.ok) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Failed to fetch commit details from GitHub' },
        { status: 400 }
      );
    }

    const commitDetails = await githubResponse.json();

    // Create task ID for tracking
    const taskId = `commit_summary_${repositoryId}_${commitSha}_${Date.now()}`;

    // Send request to Node.js worker
    const workerResponse = await fetch(`${process.env.NODE_WORKER_URL}/process-commit-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },      body: JSON.stringify({
        taskId,
        repositoryId,
        userId: user.id,
        commitData: {
          ...commitData,
          id: taskId,
        },
        changes: commitDetails.files || [],
        type: 'summarize_commit'
      })
    });

    if (!workerResponse.ok) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Failed to queue commit summarization' },
        { status: 500 }
      );
    }    // Update or create commit record with summary status
    let summary;
    if (existingCommit) {
      // Update existing commit
      summary = await prisma.commit.update({
        where: { id: existingCommit.id },
        data: {
          summary: 'Generating summary...',
          status: 'PENDING',
        },
      });
    } else {
      // This shouldn't happen in normal flow since commits should exist
      // but handle it gracefully
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Commit not found in database' },
        { status: 404 }
      );
    }

    await prisma.$disconnect();    // Start polling for completion (simplified approach)
    // In production, you might want to use WebSockets or Server-Sent Events
    setTimeout(async () => {
      try {
        // Check task status and update summary
        const statusResponse = await fetch(`${process.env.NODE_WORKER_URL}/task-status/${taskId}`);
        if (statusResponse.ok) {
          const taskStatus = await statusResponse.json();
          if (taskStatus.status === 'completed' && taskStatus.result?.summary) {
            const prismaUpdate = new (await import('@prisma/client')).PrismaClient();
            await prismaUpdate.commit.update({
              where: { id: summary.id },
              data: {
                summary: taskStatus.result.summary,
                status: 'COMPLETED',
              },
            });
            await prismaUpdate.$disconnect();
          }
        }
      } catch (error) {
        console.error('Error updating commit summary:', error);
      }
    }, 2000);    return NextResponse.json({
      commit_id: summary.id,
      commit_sha: commitSha,
      summary: summary.summary,
      status: summary.status,
      generated_at: summary.updatedAt.toISOString(),
    });

  } catch (error) {
    console.error('Error generating commit summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate commit summary' },
      { status: 500 }
    );
  }
}
