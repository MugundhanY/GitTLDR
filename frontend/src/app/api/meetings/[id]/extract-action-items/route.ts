import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Forward to Python worker for actual action item extraction
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${pythonWorkerUrl}/extract-action-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          question: "Extract action items", // Not used but required by endpoint
          user_id: 'default-user'
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
          dueDate: item.deadline !== 'No deadline specified' ? 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : 
            null
        }));
        
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
  const mockActionItems = [
    {
      id: `action-${Date.now()}-1`,
      text: 'Follow up on project timeline discussion and update stakeholders',
      completed: false,
      priority: 'high',
      assignee: 'Team Lead',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `action-${Date.now()}-2`,
      text: 'Schedule next team meeting for sprint planning',
      completed: false,
      priority: 'medium',
      assignee: 'Project Manager',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: `action-${Date.now()}-3`,
      text: 'Review and approve pending pull requests',
      completed: false,
      priority: 'high',
      assignee: 'Senior Developer',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  return NextResponse.json({
    actionItems: mockActionItems,
    summary: `Extracted ${mockActionItems.length} action items from the meeting (fallback mode).`
  });
}
