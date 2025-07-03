import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get meeting from database
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: {
        summary: true,
        user_edited_summary: true
      }
    });
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      summary: meeting.user_edited_summary || meeting.summary || null,
      userEditedSummary: meeting.user_edited_summary,
      originalSummary: meeting.summary
    });
  } catch (error) {
    console.error('Get summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();
    const { summary, type } = body;
    
    if (!summary) {
      return NextResponse.json(
        { error: 'Summary is required' },
        { status: 400 }
      );
    }
    
    // Update the meeting summary in database
    const updatedMeeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        user_edited_summary: summary
      },
      select: {
        id: true,
        summary: true,
        user_edited_summary: true
      }
    });
    
    console.log(`Meeting ${meetingId} summary updated:`, { summary, type });
    
    return NextResponse.json({ 
      success: true, 
      summary: updatedMeeting.user_edited_summary,
      originalSummary: updatedMeeting.summary,
      type: type || 'user'
    });
  } catch (error) {
    console.error('Save summary API error:', error);
    return NextResponse.json(
      { error: 'Failed to save summary' },
      { status: 500 }
    );
  }
}
