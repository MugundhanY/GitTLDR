import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get meeting with participants from database
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        id: true,
        participants: true,
      }
    });
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }
    
    // Convert participants array to objects with IDs
    const participants = meeting.participants.map((name: string, index: number) => ({
      id: `${meetingId}-${index}`,
      name: name.trim(),
    }));
    
    return NextResponse.json({ 
      participants,
      totalParticipants: participants.length,
    });
  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}
