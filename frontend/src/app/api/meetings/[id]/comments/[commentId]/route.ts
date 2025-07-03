import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: meetingId, commentId } = await params;
    
    // Delete comment from database
    const deletedComment = await prisma.meetingComment.delete({
      where: { 
        id: commentId,
        meetingId // Ensure comment belongs to this meeting
      }
    });
    
    console.log(`Deleted comment ${commentId} from meeting ${meetingId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully' 
    });
  } catch (error: any) {
    console.error('Delete comment API error:', error);
    
    // Handle case where comment doesn't exist
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
