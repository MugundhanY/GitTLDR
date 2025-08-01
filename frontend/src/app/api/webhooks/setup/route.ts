import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { repositoryId } = await request.json();

    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
    }

    // Verify repository belongs to user
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: authUser.id
      }
    });

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Generate webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github/${repositoryId}`;
    
    // In a real implementation, you would:
    // 1. Create webhook on GitHub using their API
    // 2. Store webhook configuration in database
    // 3. Return webhook setup instructions

    const webhookSetup = {
      repositoryId,
      webhookUrl,
      secret: generateWebhookSecret(),
      events: ['push', 'pull_request', 'issues'],
      instructions: {
        step1: 'Go to your repository settings on GitHub',
        step2: 'Navigate to Webhooks section',
        step3: `Add new webhook with URL: ${webhookUrl}`,
        step4: 'Select these events: push, pull_request, issues',
        step5: 'Set content type to application/json',
        step6: `Add secret: ${generateWebhookSecret()}`
      }
    };

    return NextResponse.json({
      message: 'Webhook setup configuration generated',
      webhook: webhookSetup
    });

  } catch (error) {
    console.error('Error setting up webhook:', error);
    return NextResponse.json(
      { error: 'Failed to setup webhook' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's repositories and their webhook status
    const repositories = await prisma.repository.findMany({
      where: { userId: authUser.id },
      select: {
        id: true,
        name: true,
        fullName: true,
        isPrivate: true,
        createdAt: true
      }
    });

    // Mock webhook status - in real app, store this in database
    const webhookStatuses = repositories.map(repo => ({
      id: repo.id,
      repository: repo.name,
      fullName: repo.fullName,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github/${repo.id}`,
      status: Math.random() > 0.3 ? 'active' : 'inactive', // Mock status
      lastTriggered: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      eventsCount: Math.floor(Math.random() * 50)
    }));

    return NextResponse.json({ webhooks: webhookStatuses });

  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function generateWebhookSecret(): string {
  return 'whsec_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
