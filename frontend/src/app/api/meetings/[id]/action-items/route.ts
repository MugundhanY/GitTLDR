import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    const actionItems = await prisma.meetingActionItem.findMany({
      where: {
        meetingId: meetingId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform for frontend compatibility
    const transformedItems = actionItems.map(item => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
      priority: item.priority.toLowerCase(),
      assignee: item.assignee ? item.assignee.name : 'Unassigned',
      assigneeDetails: item.assignee,
      creator: item.creator,
      dueDate: item.dueDate?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));

    return NextResponse.json({ 
      actionItems: transformedItems,
      summary: `Found ${transformedItems.length} action items for this meeting.`
    });
  } catch (error) {
    console.error('Error fetching action items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const { text, priority = 'MEDIUM', assigneeId, dueDate } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Action item text is required' }, { status: 400 });
    }

    const actionItem = await prisma.meetingActionItem.create({
      data: {
        meetingId,
        userId: user.id,
        text: text.trim(),
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        creator: {
          select: {
            name: true,
            avatarUrl: true
          }
        },
        assignee: {
          select: {
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json({ actionItem });
  } catch (error) {
    console.error('Error creating action item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: meetingId } = await params;
    const { actionItemId, status, completed } = await request.json();

    console.log('PUT request data:', { meetingId, actionItemId, status, completed });

    if (!actionItemId) {
      return NextResponse.json({ error: 'Action item ID is required' }, { status: 400 });
    }

    // First check if the action item exists
    const existingItem = await prisma.meetingActionItem.findFirst({
      where: { 
        id: actionItemId,
        meetingId // Ensure the action item belongs to this meeting
      }
    });

    console.log('Existing item found:', existingItem ? 'Yes' : 'No');
    
    if (!existingItem) {
      // Log all action items for this meeting to help debug
      const allItems = await prisma.meetingActionItem.findMany({
        where: { meetingId },
        select: { id: true, text: true }
      });
      console.error(`Action item not found: ${actionItemId} for meeting: ${meetingId}`);
      console.error('Available action items:', allItems);
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Update the action item
    const updatedItem = await prisma.meetingActionItem.update({
      where: { 
        id: actionItemId
      },
      data: { 
        completed: completed !== undefined ? completed : (status === 'COMPLETED'),
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    // Transform for frontend compatibility
    const transformedItem = {
      id: updatedItem.id,
      text: updatedItem.text,
      completed: updatedItem.completed,
      priority: updatedItem.priority.toLowerCase(),
      assignee: updatedItem.assignee ? updatedItem.assignee.name : 'Unassigned',
      assigneeDetails: updatedItem.assignee,
      creator: updatedItem.creator,
      dueDate: updatedItem.dueDate?.toISOString() || null,
      createdAt: updatedItem.createdAt.toISOString(),
      updatedAt: updatedItem.updatedAt.toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      actionItem: transformedItem 
    });
  } catch (error) {
    console.error('Error updating action item:', error);
    return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
  }
}
