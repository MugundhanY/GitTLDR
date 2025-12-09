import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req, true);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { 
      repositoryId, 
      issueNumber, 
      issueTitle, 
      issueBody, 
      issueUrl 
    } = await req.json();
    
    // Verify repository ownership
    const repository = await prisma.repository.findUnique({
      where: { id: repositoryId }
    });
    
    if (!repository || repository.userId !== user.id) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    
    // Create or update IssueFix record (handles re-running fixes on same issue)
    const issueFix = await prisma.issueFix.upsert({
      where: {
        repositoryId_issueNumber: {
          repositoryId,
          issueNumber
        }
      },
      update: {
        issueTitle,
        issueBody,
        issueUrl,
        status: 'PENDING',
        analysis: Prisma.JsonNull,
        relevantFiles: Prisma.JsonNull,
        proposedFix: Prisma.JsonNull,
        explanation: null,
        confidence: null,
        prNumber: null,
        prUrl: null,
        errorMessage: null,
        updatedAt: new Date()
      },
      create: {
        repositoryId,
        userId: user.id,
        issueNumber,
        issueTitle,
        issueBody,
        issueUrl,
        status: 'PENDING'
      }
    });
    
    const jobId = `issue_fix_${issueFix.id}_${Date.now()}`;
    
    // Create job in Redis
    await redis.hset(`job:${jobId}`, {
      id: jobId,
      type: 'issue_fix',
      issueFixId: issueFix.id,
      repositoryId,
      userId: user.id,
      issueNumber,
      status: 'queued',
      createdAt: new Date().toISOString()
    });
    
    // Queue job for Python API server
    await redis.lpush('gittldr_tasks', JSON.stringify({
      jobId,
      type: 'issue_fix',
      issueFixId: issueFix.id,
      repositoryId,
      userId: user.id,
      issueNumber,
      issueTitle,
      issueBody,
      timestamp: new Date().toISOString()
    }));
    
    return NextResponse.json({ 
      jobId, 
      issueFixId: issueFix.id,
      status: 'queued' 
    });
    
  } catch (error) {
    console.error('Error analyzing issue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
