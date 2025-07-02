import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/meetings/[id] - Get detailed meeting information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Fetch meeting with all segments
    const meeting = await prisma.meeting.findUnique({
      where: {
        id: id
      },
      include: {
        meeting_segments: {
          orderBy: {
            segment_index: 'asc'
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Transform the data for the frontend
    const transformedMeeting = {
      id: meeting.id,
      title: meeting.title,
      transcript: meeting.full_transcript || undefined,
      summary: meeting.summary || undefined,
      status: meeting.status.toLowerCase(),
      createdAt: meeting.created_at.toISOString(),
      updatedAt: meeting.updated_at.toISOString(),
      language: meeting.language || undefined,
      source: meeting.source || undefined,
      segmentCount: meeting.num_segments || 0,
      user: meeting.user,
      segments: meeting.meeting_segments.map(segment => ({
        id: segment.id,
        title: segment.title,
        summary: segment.summary,
        excerpt: segment.excerpt,
        text: segment.segment_text,
        startTime: segment.start_time,
        endTime: segment.end_time,
        index: segment.segment_index,
        duration: segment.end_time - segment.start_time
      }))
    };

    return NextResponse.json({ meeting: transformedMeeting });

  } catch (error) {
    console.error('Error fetching meeting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meeting' },
      { status: 500 }
    );
  }
}
