import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// Repository API endpoints

// POST /api/repositories - Add a new repository
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      repoUrl, 
      name, 
      fullName, 
      owner, 
      url, 
      description, 
      language, 
      stars, 
      forks, 
      watchers_count,
      avatar_url,
      isPrivate,
      creditsNeeded 
    } = body;

    // Support both old format (repoUrl) and new format (detailed repo data)
    const repositoryUrl = url || repoUrl;
    
    if (!repositoryUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    // Extract repo info from URL if detailed data not provided
    let repoName = name;
    let repoOwner = owner;
    let repoFullName = fullName;
    
    if (!repoName || !repoOwner) {
      const repoMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!repoMatch) {
        return NextResponse.json(
          { error: 'Invalid GitHub repository URL' },
          { status: 400 }
        );
      }
      const [, extractedOwner, extractedName] = repoMatch;
      repoName = repoName || extractedName;
      repoOwner = repoOwner || extractedOwner;
      repoFullName = repoFullName || `${extractedOwner}/${extractedName}`;
    }    // Check if user has enough credits (if credits are needed)
    const credits = creditsNeeded || 0;
    if (credits > 0) {
      const userCredits = user.credits || 0;
      if (userCredits < credits) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${credits} credits to add this repository.` },
          { status: 400 }
        );
      }

      // Deduct credits from user and create transaction record
      await prisma.$transaction([
        // Deduct credits from user
        prisma.user.update({
          where: { id: user.id },
          data: {
            credits: {
              decrement: credits
            }
          }
        }),
        // Create transaction record
        prisma.transaction.create({
          data: {
            type: 'USAGE',
            credits: -credits,
            description: `Repository analysis: ${repoFullName}`,
            userId: user.id
          }
        })
      ]);
    }

    // Save repository to database using Prisma
    const repository = await prisma.repository.create({
      data: {
        name: repoName,
        fullName: repoFullName,
        owner: repoOwner,
        url: repositoryUrl,
        userId: user.id,
        embeddingStatus: 'PENDING',
        description: description || '',
        language: language || '',
        stars: stars || 0,
        forks: forks || 0,
        watchersCount: watchers_count || 0,
        avatarUrl: avatar_url || '',
        isPrivate: isPrivate || false
      }
    });

    // Send processing request to Node.js worker
    const workerResponse = await fetch(`${process.env.NODE_WORKER_URL}/process-repository`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repositoryId: repository.id,
        userId: user.id,
        repoUrl: repositoryUrl,
        action: 'full_analysis'
      })
    });

    if (!workerResponse.ok) {
      throw new Error('Failed to queue repository processing');
    }

    const workerResult = await workerResponse.json();

    return NextResponse.json({
      repository,
      jobId: workerResult.jobId,
      status: 'processing',
      creditsDeducted: credits
    });

  } catch (error) {
    console.error('Error creating repository:', error);
    return NextResponse.json(
      { error: 'Failed to process repository' },
      { status: 500 }
    );
  }
}

// GET /api/repositories - Get user's repositories
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Fetch repositories from database using Prisma
    const repositories = await prisma.repository.findMany({
      where: {
        userId: user.id
      },
      include: {
        files: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to include file count
    const repositoriesWithFileCount = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      owner: repo.owner,
      url: repo.url,
      description: repo.description,
      language: repo.language,
      stars: repo.stars,
      forks: repo.forks,
      isPrivate: repo.isPrivate,
      processed: repo.processed,
      status: repo.embeddingStatus,
      summary: repo.summary,
      fileCount: repo.files.length,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt
    }));

    return NextResponse.json({ repositories: repositoriesWithFileCount });

  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
