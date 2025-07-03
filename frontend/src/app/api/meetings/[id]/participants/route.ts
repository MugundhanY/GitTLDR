import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for meeting participants (in production, use a real database)
const participantsStorage = new Map<string, any[]>();

// Initialize with some mock data
participantsStorage.set('1', [
  { id: '1', name: 'Alex Thompson', role: 'Project Manager', speakingTime: 180 },
  { id: '2', name: 'Sarah Chen', role: 'Lead Developer', speakingTime: 240 },
  { id: '3', name: 'Marcus Rodriguez', role: 'UX Designer', speakingTime: 120 },
  { id: '4', name: 'Emily Davis', role: 'Business Analyst', speakingTime: 90 }
]);

participantsStorage.set('2', [
  { id: '1', name: 'David Park', role: 'Tech Lead', speakingTime: 210 },
  { id: '2', name: 'Lisa Anderson', role: 'Product Owner', speakingTime: 190 },
  { id: '3', name: 'Tom Wilson', role: 'Developer', speakingTime: 85 }
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get participants for this meeting from storage
    const participants = participantsStorage.get(meetingId) || [
      { id: '1', name: 'Meeting Participant', role: 'Attendee', speakingTime: 60 }
    ];
    
    // Calculate total speaking time
    const totalSpeakingTime = participants.reduce((sum, p) => sum + (p.speakingTime || 0), 0);
    
    return NextResponse.json({ 
      participants: participants.map(p => ({
        ...p,
        speakingPercentage: totalSpeakingTime > 0 ? Math.round((p.speakingTime / totalSpeakingTime) * 100) : 0
      })),
      totalParticipants: participants.length,
      totalSpeakingTime
    });
  } catch (error) {
    console.error('Participants API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();
    const { participants } = body;
    
    if (!participants || !Array.isArray(participants)) {
      return NextResponse.json(
        { error: 'Valid participants array is required' },
        { status: 400 }
      );
    }
    
    // Store participants for this meeting
    participantsStorage.set(meetingId, participants);
    
    console.log(`Updated participants for meeting ${meetingId}:`, participants);
    
    return NextResponse.json({ 
      success: true, 
      participants 
    });
  } catch (error) {
    console.error('Update participants API error:', error);
    return NextResponse.json(
      { error: 'Failed to update participants' },
      { status: 500 }
    );
  }
}
