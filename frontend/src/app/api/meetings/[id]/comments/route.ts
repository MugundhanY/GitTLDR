import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get comments for this meeting from database
    const comments = await prisma.meetingComment.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
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
    const { text, timestamp, segmentId, userId = 'default-user' } = body;
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }
    
    // Create new comment in database
    const newComment = await prisma.meetingComment.create({
      data: {
        meetingId,
        text: text.trim(),
        timestamp: timestamp || 0,
        segmentId,
        userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
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
