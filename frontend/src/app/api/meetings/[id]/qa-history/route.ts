import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory storage for Q&A history
// In production, this would be replaced with proper database storage
const qaStorage = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get Q&A history from temporary storage
    const storageKey = `${meetingId}-${userId}`;
    const qaItems = qaStorage.get(storageKey) || [];

    return NextResponse.json({
      qaItems: qaItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });

  } catch (error) {
    console.error('Q&A history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Q&A history' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();
    const { question, answer, confidence, timestamp, relatedSegments, userId } = body;

    if (!question || !answer || !userId) {
      return NextResponse.json(
        { error: 'Question, answer, and user ID are required' },
        { status: 400 }
      );
    }

    // Create Q&A item
    const qaItem = {
      id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question,
      answer,
      timestamp: timestamp || null,
      relatedSegments: relatedSegments || [],
      confidence: confidence || 0.8,
      createdAt: new Date().toISOString()
    };

    // Store in temporary storage
    const storageKey = `${meetingId}-${userId}`;
    const existingItems = qaStorage.get(storageKey) || [];
    existingItems.push(qaItem);
    qaStorage.set(storageKey, existingItems);

    return NextResponse.json({
      qaItem
    });

  } catch (error) {
    console.error('Q&A store API error:', error);
    return NextResponse.json(
      { error: 'Failed to store Q&A' },
      { status: 500 }
    );
  }
}