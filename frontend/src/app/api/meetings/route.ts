import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/meetings - Process meeting audio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, audioUrl, participants, title } = body;

    if (!userId || !audioUrl) {
      return NextResponse.json(
        { error: 'User ID and audio URL are required' },
        { status: 400 }
      );
    }

    // TODO: Create meeting record in database using Prisma
    // For now, create a mock meeting object
    const meeting = {
      id: Date.now().toString(),
      userId,
      title: title || 'Untitled Meeting',
      audioUrl,
      participants: participants || [],
      status: 'processing',
      createdAt: new Date().toISOString()
    };

    // Send processing request to Node.js worker
    const workerResponse = await fetch(`${process.env.NODE_WORKER_URL}/process-meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: meeting.id,
        userId,
        audioUrl,
        participants
      })
    });

    if (!workerResponse.ok) {
      throw new Error('Failed to queue meeting processing');
    }

    const workerResult = await workerResponse.json();

    return NextResponse.json({
      meeting,
      jobId: workerResult.jobId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error processing meeting:', error);
    return NextResponse.json(
      { error: 'Failed to process meeting' },
      { status: 500 }
    );
  }
}

// GET /api/meetings - Get user's meetings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch meetings from database using Prisma
    const meetings = await prisma.meeting.findMany({
      where: {
        userId: userId
      },
      include: {
        meeting_segments: {
          select: {
            id: true,
            title: true,
            summary: true,
            start_time: true,
            end_time: true,
            segment_index: true
          },
          orderBy: {
            segment_index: 'asc'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data to match the frontend interface
    const transformedMeetings = meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      transcript: meeting.full_transcript || undefined,
      summary: meeting.summary || undefined,
      status: meeting.status.toLowerCase(),
      createdAt: meeting.created_at.toISOString(),
      updatedAt: meeting.updated_at.toISOString(),
      language: meeting.language || undefined,
      segmentCount: meeting.num_segments || 0,
      segments: meeting.meeting_segments.map(segment => ({
        id: segment.id,
        title: segment.title,
        summary: segment.summary,
        startTime: segment.start_time,
        endTime: segment.end_time,
        index: segment.segment_index
      }))
    }));

    return NextResponse.json({ meetings: transformedMeetings });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}
