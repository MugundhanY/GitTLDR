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
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';
    
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
    return NextResponse.json(data);

  } catch (error) {
    console.error('Q&A API error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
