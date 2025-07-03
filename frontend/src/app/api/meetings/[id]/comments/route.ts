import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for comments (in production, use a real database)
const commentStorage = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get comments for this meeting from storage
    const comments = commentStorage.get(meetingId) || [];
    
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Comments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
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
    const { text, timestamp, segmentId } = body;
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }
    
    // Create new comment
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      timestamp: timestamp || 0,
      segmentId,
      createdAt: new Date().toISOString(),
      user: {
        name: 'You',
        avatarUrl: null
      }
    };
    
    // Get existing comments or initialize empty array
    const existingComments = commentStorage.get(meetingId) || [];
    
    // Add new comment
    const updatedComments = [...existingComments, newComment];
    
    // Store updated comments
    commentStorage.set(meetingId, updatedComments);
    
    console.log(`Added comment to meeting ${meetingId}:`, newComment);
    
    return NextResponse.json({ 
      success: true,
      comment: newComment 
    });
  } catch (error) {
    console.error('Add comment API error:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
