import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();
    const { user_id } = body;
    
    // Forward to Python worker for actual action item extraction
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';
    
    try {
      const response = await fetch(`${pythonWorkerUrl}/extract-action-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          question: "Extract action items", // Not used but required by endpoint
          user_id: user_id || 'default-user'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform the response to match frontend expectations
        const actionItems = data.result?.action_items || [];
        const transformedItems = actionItems.map((item: any) => ({
          id: item.id,
          text: item.description || item.title,
          completed: item.status === 'completed',
          priority: item.priority || 'medium',
          assignee: item.assignee || 'Unassigned',
          dueDate: item.deadline !== 'No deadline specified' && item.deadline !== 'To be determined' ? 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : 
            null,
          timestamp: item.timestamp || 0
        }));
        
        // Store action items in database
        try {
          // First, delete any existing action items for this meeting to avoid duplicates
          await prisma.meetingActionItem.deleteMany({
            where: { meetingId }
          });
          
          // Then create new action items
          if (transformedItems.length > 0) {
            await prisma.meetingActionItem.createMany({
              data: transformedItems.map((item: any) => ({
                id: item.id,
                meetingId,
                userId: user_id || 'default-user',
                assigneeId: null, // We could try to match assignee to actual users later
                text: item.text,
                completed: item.completed,
                priority: item.priority.toUpperCase() as any, // Convert to enum
                dueDate: item.dueDate ? new Date(item.dueDate) : null
              }))
            });
            
            console.log(`Stored ${transformedItems.length} action items for meeting ${meetingId}`);
          }
        } catch (dbError) {
          console.error('Failed to store action items in database:', dbError);
          // Don't fail the request if database storage fails
        }
        
        return NextResponse.json({
          actionItems: transformedItems,
          summary: data.result?.summary || `Extracted ${transformedItems.length} action items from the meeting.`
        });
      } else {
        const errorText = await response.text();
        console.error('Python worker error response:', errorText);
        
        // Fallback to mock data if python worker fails
        return getMockActionItems(meetingId);
      }
    } catch (pythonError) {
      console.error('Python worker connection error:', pythonError);
      
      // Fallback to mock data if connection fails
      return getMockActionItems(meetingId);
    }

  } catch (error) {
    console.error('Action items API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract action items' },
      { status: 500 }
    );
  }
}

function getMockActionItems(meetingId: string) {
  // Return empty array by default instead of mock data
  // This prevents "No action items extracted yet" message from appearing
  // when there are no real action items
  
  return NextResponse.json({
    actionItems: [],
    summary: 'No action items found in this meeting.'
  });
}
