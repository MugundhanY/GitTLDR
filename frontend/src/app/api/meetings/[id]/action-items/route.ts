import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;
    
    const actionItems = await prisma.meetingActionItem.findMany({
      where: {
        meetingId: meetingId
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ actionItems });
  } catch (error) {
    console.error('Error fetching action items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const meetingId = params.id;
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
