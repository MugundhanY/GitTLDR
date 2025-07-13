import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionItemId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionItemId } = await params;
    const { completed, text, priority, assigneeId, dueDate } = await request.json();

    // Check if action item exists
    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id: actionItemId }
    });

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    // Allow updates by creator or assignee
    if (actionItem.userId !== user.id && actionItem.assigneeId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to update this action item' }, { status: 403 });
    }

    const updatedActionItem = await prisma.meetingActionItem.update({
      where: { id: actionItemId },
      data: {
        ...(completed !== undefined && { completed }),
        ...(text && { text: text.trim() }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
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

    return NextResponse.json({ actionItem: updatedActionItem });
  } catch (error) {
    console.error('Error updating action item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionItemId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionItemId } = await params;

    // Check if action item exists and belongs to the user
    const actionItem = await prisma.meetingActionItem.findUnique({
      where: { id: actionItemId }
    });

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
    }

    if (actionItem.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this action item' }, { status: 403 });
    }

    await prisma.meetingActionItem.delete({
      where: { id: actionItemId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting action item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
