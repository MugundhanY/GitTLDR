import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: Fetch meetings from database using Prisma
    // For now, return mock data
    const meetings = [
      {
        id: '1',
        title: 'Weekly Team Standup',
        participants: ['John Doe', 'Jane Smith', 'Bob Johnson'],
        duration: '00:45:30',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'completed',
        summary: 'Team discussed current sprint progress, blockers, and upcoming tasks. Key decisions were made regarding the new feature rollout.',
        keyPoints: [
          'Sprint is on track for Friday delivery',
          'Database migration needs additional testing',
          'New UI components ready for review'
        ]
      },
      {
        id: '2',
        title: 'Product Planning Session',
        participants: ['Alice Brown', 'Charlie Wilson'],
        duration: '01:20:15',
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        status: 'completed',
        summary: 'Roadmap planning for Q2, feature prioritization, and resource allocation discussions.',
        keyPoints: [
          'Q2 focus on mobile app improvements',
          'AI features to be prioritized',
          'Need additional backend resources'
        ]
      }
    ];

    return NextResponse.json({ meetings });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}
