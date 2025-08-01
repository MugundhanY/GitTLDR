import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { repositoryId: string } }
) {
  try {
    const { repositoryId } = params;
    const body = await request.text();
    
    // Verify webhook signature (in production)
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    
    if (!event) {
      return NextResponse.json({ error: 'Missing event header' }, { status: 400 });
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    
    // Find repository
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { user: true }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Process different GitHub events
    switch (event) {
      case 'push':
        await handlePushEvent(payload, repository);
        break;
      case 'pull_request':
        await handlePullRequestEvent(payload, repository);
        break;
      case 'issues':
        await handleIssueEvent(payload, repository);
        break;
      default:
        console.log(`Unhandled event: ${event}`);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function handlePushEvent(payload: any, repository: any) {
  const commits = payload.commits || [];
  
  for (const commit of commits) {
    try {
      // Store commit in database
      await prisma.commit.create({
        data: {
          sha: commit.id,
          message: commit.message,
          timestamp: new Date(commit.timestamp),
          url: commit.url,
          authorName: commit.author?.name || 'Unknown',
          authorEmail: commit.author?.email || 'unknown@example.com',
          authorAvatar: commit.author?.avatar_url || null,
          filesChanged: commit.added?.length + commit.removed?.length + commit.modified?.length || 0,
          createdAt: new Date(commit.timestamp),
          repository: {
            connect: { id: repository.id }
          }
        }
      });

      // Trigger AI analysis (queue for background processing)
      await queueCommitAnalysis(commit, repository);
      
    } catch (error) {
      console.error('Error storing commit:', error);
    }
  }
}

async function handlePullRequestEvent(payload: any, repository: any) {
  const action = payload.action;
  const pullRequest = payload.pull_request;
  
  if (action === 'opened' || action === 'synchronize') {
    // Queue PR analysis
    await queuePRAnalysis(pullRequest, repository);
  }
}

async function handleIssueEvent(payload: any, repository: any) {
  const action = payload.action;
  const issue = payload.issue;
  
  if (action === 'opened') {
    // Queue issue analysis for automatic labeling/categorization
    await queueIssueAnalysis(issue, repository);
  }
}

async function queueCommitAnalysis(commit: any, repository: any) {
  // In production, this would queue a background job
  // For now, just log the action
  console.log(`Queued analysis for commit ${commit.id} in ${repository.name}`);
  
  // You could integrate with:
  // - Redis for job queuing
  // - Background worker processes
  // - Webhook to python-worker for AI analysis
  
  try {
    // Example: Send to python worker for analysis
    const response = await fetch(`${process.env.PYTHON_WORKER_URL}/analyze-commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repository.id,
        commitSha: commit.id,
        commitMessage: commit.message,
        authorName: commit.author?.name,
        filesChanged: commit.added?.length + commit.removed?.length + commit.modified?.length || 0
      })
    });
    
    if (response.ok) {
      console.log(`Successfully triggered analysis for commit ${commit.id}`);
    }
  } catch (error) {
    console.error('Failed to trigger commit analysis:', error);
  }
}

async function queuePRAnalysis(pullRequest: any, repository: any) {
  console.log(`Queued PR analysis for #${pullRequest.number} in ${repository.name}`);
  
  try {
    // Send to python worker for PR analysis
    const response = await fetch(`${process.env.PYTHON_WORKER_URL}/analyze-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repository.id,
        prNumber: pullRequest.number,
        title: pullRequest.title,
        body: pullRequest.body,
        author: pullRequest.user?.login,
        changedFiles: pullRequest.changed_files || 0
      })
    });
    
    if (response.ok) {
      console.log(`Successfully triggered PR analysis for #${pullRequest.number}`);
    }
  } catch (error) {
    console.error('Failed to trigger PR analysis:', error);
  }
}

async function queueIssueAnalysis(issue: any, repository: any) {
  console.log(`Queued issue analysis for #${issue.number} in ${repository.name}`);
  
  try {
    // Send to python worker for issue analysis
    const response = await fetch(`${process.env.PYTHON_WORKER_URL}/analyze-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: repository.id,
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body,
        author: issue.user?.login,
        labels: issue.labels?.map((l: any) => l.name) || []
      })
    });
    
    if (response.ok) {
      console.log(`Successfully triggered issue analysis for #${issue.number}`);
    }
  } catch (error) {
    console.error('Failed to trigger issue analysis:', error);
  }
}
