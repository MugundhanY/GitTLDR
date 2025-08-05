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

    const { repositoryId, githubToken } = await request.json();

    if (!repositoryId || !githubToken) {
      return NextResponse.json({ error: 'Repository ID and GitHub token are required' }, { status: 400 });
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

    // Prepare webhook configuration
    const webhookUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`;
    const webhookSecret = process.env.WEBHOOK_SECRET || generateWebhookSecret();

    const webhookConfig = {
      name: 'web',
      active: true,
      events: ['push', 'repository'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: webhookSecret,
        insecure_ssl: '0'
      }
    };

    // Extract owner and repo name from repository URL or full name
    const [owner, repoName] = repository.fullName.split('/');

    // Create webhook on GitHub
    const githubResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/hooks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookConfig)
      }
    );

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json();
      console.error('GitHub webhook creation failed:', errorData);
      
      // Handle specific GitHub API errors
      if (githubResponse.status === 422 && errorData.errors?.some((e: any) => e.message?.includes('Hook already exists'))) {
        return NextResponse.json(
          { error: 'Webhook already exists for this repository' },
          { status: 400 }
        );
      }
      
      if (githubResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid GitHub token or insufficient permissions' },
          { status: 401 }
        );
      }
      
      if (githubResponse.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found or token lacks access' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `GitHub API error: ${errorData.message || 'Unknown error'}` },
        { status: githubResponse.status }
      );
    }

    const webhookData = await githubResponse.json();

    // Update repository record with webhook information
    await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        hasWebhook: true,
        webhookId: webhookData.id.toString(),
        webhookUrl: webhookData.url,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook configured successfully',
      webhook: {
        id: webhookData.id,
        url: webhookData.url,
        events: webhookData.events,
        active: webhookData.active
      }
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
        url: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    const repositoriesWithWebhookStatus = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      url: repo.url,
      isPrivate: repo.isPrivate,
      hasWebhook: false, // Will be updated after migration
      webhookUrl: null
    }));

    return NextResponse.json({ 
      success: true,
      repositories: repositoriesWithWebhookStatus 
    });

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
