import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id;
    
    // Mock action items extraction
    const mockActionItems = [
      {
        id: `action-${Date.now()}-1`,
        text: 'Follow up on project timeline discussion and update stakeholders',
        completed: false,
        priority: 'high',
        assignee: 'Team Lead',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
      },
      {
        id: `action-${Date.now()}-2`,
        text: 'Schedule next team meeting for sprint planning',
        completed: false,
        priority: 'medium',
        assignee: 'Project Manager',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
      },
      {
        id: `action-${Date.now()}-3`,
        text: 'Review and approve pending pull requests',
        completed: false,
        priority: 'high',
        assignee: 'Senior Developer',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
      }
    ];

    return NextResponse.json({
      actionItems: mockActionItems
    });
  } catch (error) {
    console.error('Extract action items error:', error);
    return NextResponse.json(
      { error: 'Failed to extract action items' },
      { status: 500 }
    );
  }
}
