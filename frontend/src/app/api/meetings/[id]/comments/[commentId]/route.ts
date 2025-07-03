import { NextRequest, NextResponse } from 'next/server';

// Import the same storage from the parent route
// Note: In production, this would be a shared database
const commentStorage = new Map<string, any[]>();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: meetingId, commentId } = await params;
    
    // Get existing comments for this meeting
    const existingComments = commentStorage.get(meetingId) || [];
    
    // Filter out the comment to delete
    const updatedComments = existingComments.filter(comment => comment.id !== commentId);
    
    // Check if comment was found and deleted
    if (existingComments.length === updatedComments.length) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }
    
    // Update storage
    commentStorage.set(meetingId, updatedComments);
    
    console.log(`Deleted comment ${commentId} from meeting ${meetingId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Comment deleted successfully' 
    });
  } catch (error) {
    console.error('Delete comment API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
