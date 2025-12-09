import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getUserFromRequest(req, true);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { jobId } = await params;
    
    // Get job status from Redis
    const jobData = await redis.hgetall(`job:${jobId}`);
    
    if (!jobData.id) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Get IssueFix record
    const issueFix = await prisma.issueFix.findUnique({
      where: { id: jobData.issueFixId }
    });
    
    console.log(`📊 Fix status for job ${jobId}:`, {
      issueFixId: jobData.issueFixId,
      found: !!issueFix,
      status: issueFix?.status,
      hasProposedFix: !!issueFix?.proposedFix,
      completedAt: issueFix?.completedAt
    });
    
    if (!issueFix || issueFix.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    return NextResponse.json({ 
      fix: issueFix,
      jobStatus: jobData 
    });
    
  } catch (error) {
    console.error('Error fetching fix status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
