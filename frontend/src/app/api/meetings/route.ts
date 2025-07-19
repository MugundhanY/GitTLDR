import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { checkRepositoryAccess } from '@/lib/repository-access';

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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');

    // Build where clause
    let where: any = {};

    if (repositoryId) {
      // Check repository access if repositoryId is provided
      const hasAccess = await checkRepositoryAccess(repositoryId, user.id);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 });
      }
      
      where.repositoryId = repositoryId;
    } else {
      // If no repositoryId, get meetings from repositories the user has access to
      const userRepositories = await prisma.repository.findMany({
        where: {
          OR: [
            { userId: user.id }, // User owns the repository
            { 
              shareSettings: {
                some: {
                  userId: user.id // User has been shared the repository
                }
              }
            }
          ]
        },
        select: { id: true }
      });

      const repositoryIds = userRepositories.map(repo => repo.id);
      
      where = {
        OR: [
          { userId: user.id }, // User's own meetings
          { repositoryId: { in: repositoryIds } } // Meetings in accessible repositories
        ]
      };
    }

    // Fetch meetings from database using Prisma
    const meetings = await prisma.meeting.findMany({
      where,
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
        },
        favorites: {
          where: {
            userId: user.id
          },
          select: {
            id: true
          }
        },
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true
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
      isFavorite: meeting.favorites.length > 0,
      repositoryId: meeting.repositoryId,
      repository: meeting.repository,
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
