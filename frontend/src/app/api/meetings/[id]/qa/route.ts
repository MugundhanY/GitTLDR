import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { checkRepositoryAccess } from '@/lib/repository-access';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const body = await request.json();
    const { question } = body;

    if (!question || !meetingId) {
      return NextResponse.json(
        { error: 'Question and meeting ID are required' },
        { status: 400 }
      );
    }

    // Check if user has access to the meeting
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { 
        id: true, 
        userId: true, 
        repositoryId: true 
      }
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check access: user owns the meeting OR has access to the repository
    let hasAccess = meeting.userId === user.id;

    if (!hasAccess && meeting.repositoryId) {
      const accessResult = await checkRepositoryAccess(meeting.repositoryId, user.id);
      hasAccess = accessResult.hasAccess;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Forward to Python worker
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';
    
    const response = await fetch(`${pythonWorkerUrl}/meeting-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_id: meetingId,
        question,
        user_id: user.id
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python worker error response:', errorText);
      
      return NextResponse.json({
        error: 'Failed to process question. Please ensure the meeting has been processed and the analysis service is running.',
        details: errorText,
        status: 'processing_failed'
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Store Q&A in database if successful
    if (data.status === 'completed' && data.result) {
      try {
        await prisma.meetingQA.create({
          data: {
            meetingId,
            userId: user.id,
            question,
            answer: data.result.answer || 'No answer available',
            confidence: data.result.confidence || 0.0,
            timestamp: data.result.suggested_timestamp || null,
            relatedSegments: data.result.related_segments?.map((seg: any) => seg.segment_index?.toString() || seg.toString()) || []
          }
        });
        console.log('Q&A stored in database successfully');
      } catch (dbError) {
        console.error('Failed to store Q&A in database:', dbError);
        // Don't fail the request if database storage fails
      }
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Q&A API error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
