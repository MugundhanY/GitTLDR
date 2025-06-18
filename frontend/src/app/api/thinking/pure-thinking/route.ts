import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, context } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Get python worker URL from environment
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

    // Call python worker pure thinking endpoint
    const response = await fetch(`${pythonWorkerUrl}/pure-thinking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        context: context || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python worker pure thinking error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to process pure thinking request', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Pure Thinking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
