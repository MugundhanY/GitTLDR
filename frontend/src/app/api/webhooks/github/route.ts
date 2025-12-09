import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import WebhookBackgroundProcessor from '@/lib/webhook-processor';

const prisma = new PrismaClient();

// GitHub webhook handler for repository changes
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');

    // Verify webhook signature (optional but recommended)
    if (process.env.GITHUB_WEBHOOK_SECRET) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')}`;

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);

    // Handle different webhook events
    switch (event) {
      case 'push':
        await handlePushEvent(payload);
        break;
      case 'repository':
        await handleRepositoryEvent(payload);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

async function handlePushEvent(payload: any) {
  const repository = payload.repository;
  const commits = payload.commits;

  // Find the repository in our database
  const repo = await prisma.repository.findFirst({
    where: {
      OR: [
        { fullName: repository.full_name },
        { url: repository.html_url }
      ]
    }
  });

  if (!repo) {
    console.log(`Repository ${repository.full_name} not found in database`);
    return;
  }

  // Process new commits
  for (const commit of commits) {
    // Check if commit already exists
    const existingCommit = await prisma.commit.findUnique({
      where: {
        repositoryId_sha: {
          repositoryId: repo.id,
          sha: commit.id
        }
      }
    });

    if (!existingCommit) {
      // Create new commit record
      await prisma.commit.create({
        data: {
          sha: commit.id,
          message: commit.message,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          authorAvatar: commit.author.avatar_url || null,
          timestamp: new Date(commit.timestamp),
          url: commit.url,
          filesChanged: commit.added.length + commit.removed.length + commit.modified.length,
          repositoryId: repo.id,
          status: 'PENDING' // Will be processed by background job
        }
      });
    }
  }

  // Update repository's updated timestamp
  await prisma.repository.update({
    where: { id: repo.id },
    data: {
      updatedAt: new Date(),
      embeddingStatus: 'PENDING' // Mark for re-processing
    }
  });

  // Trigger background processing
  const processor = WebhookBackgroundProcessor.getInstance();
  await processor.addJob({
    repositoryId: repo.id,
    event: 'push',
    payload: payload,
    timestamp: new Date()
  });

  console.log(`Added push event to background processing queue for ${repository.full_name}`);
}

async function handleRepositoryEvent(payload: any) {
  if (payload.action === 'edited' || payload.action === 'updated') {
    const repository = payload.repository;

    // Find the repository in our database
    const repo = await prisma.repository.findFirst({
      where: {
        OR: [
          { fullName: repository.full_name },
          { url: repository.html_url }
        ]
      }
    });

    if (repo) {
      // Update repository metadata
      await prisma.repository.update({
        where: { id: repo.id },
        data: {
          name: repository.name,
          fullName: repository.full_name,
          description: repository.description,
          language: repository.language,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          isPrivate: repository.private,
          updatedAt: new Date(),
          embeddingStatus: 'PENDING'
        }
      });

      // Trigger background processing
      const processor = WebhookBackgroundProcessor.getInstance();
      await processor.addJob({
        repositoryId: repo.id,
        event: 'repository',
        payload: payload,
        timestamp: new Date()
      });

      console.log(`Added repository event to background processing queue for ${repository.full_name}`);
    }
  }
}


