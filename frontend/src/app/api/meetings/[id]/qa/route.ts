import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();
    const { question, user_id } = body;

    if (!question || !meetingId) {
      return NextResponse.json(
        { error: 'Question and meeting ID are required' },
        { status: 400 }
      );
    }

    // Forward to Python worker
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${pythonWorkerUrl}/meeting-qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          question,
          user_id: user_id || 'default-user'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      } else {
        const errorText = await response.text();
        console.error('Python worker error response:', errorText);
        
        return NextResponse.json({
          error: 'Meeting analysis service is currently unavailable. Please ensure the meeting has been processed and try again.',
          details: 'The Python worker service could not process your question.',
          status: 'service_unavailable'
        }, { status: 503 });
      }
    } catch (pythonError) {
      console.error('Python worker connection error:', pythonError);
      
      return NextResponse.json({
        error: 'Unable to connect to meeting analysis service. Please check if the service is running.',
        details: 'Connection failed to Python worker',
        status: 'connection_failed'
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Q&A API error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Mock Q&A history for now
    const mockQAHistory = [
      {
        id: 'qa-1',
        question: 'What were the main action items discussed?',
        answer: 'The main action items were: 1) Complete sprint tasks by Friday, 2) Schedule stakeholder meetings, and 3) Finalize project requirements.',
        timestamp: 125,
        relatedSegments: ['segment-1', 'segment-3'],
        confidence: 0.9,
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'qa-2',
        question: 'What decisions were made about the project timeline?',
        answer: 'The team decided to proceed with the aggressive timeline, with Phase 1 completion by end of week and Phase 2 starting immediately after.',
        timestamp: 340,
        relatedSegments: ['segment-2', 'segment-4'],
        confidence: 0.85,
        createdAt: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
      }
    ];
    
    return NextResponse.json({
      qaItems: mockQAHistory
    });
  } catch (error) {
    console.error('Q&A history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Q&A history' },
      { status: 500 }
    );
  }
}
