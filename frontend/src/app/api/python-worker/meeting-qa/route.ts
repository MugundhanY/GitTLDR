import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { meeting_id, question, user_id } = await request.json();

    if (!meeting_id || !question) {
      return NextResponse.json(
        { error: 'Meeting ID and question are required' },
        { status: 400 }
      );
    }

    // For now, return a mock response
    // In a real implementation, this would call the python-worker API
    const mockResponse = {
      result: {
        status: 'completed',
        answer: `Based on the meeting content, here's what I found regarding "${question}": This is a simulated answer demonstrating how the Q&A system would work. The actual implementation would analyze the meeting transcript and segments to provide contextual answers.`,
        confidence: 0.85,
        suggested_timestamp: Math.floor(Math.random() * 600) + 60,
        related_segments: [
          { segment_index: Math.floor(Math.random() * 5) + 1 },
          { segment_index: Math.floor(Math.random() * 5) + 1 }
        ]
      }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('Meeting Q&A API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
