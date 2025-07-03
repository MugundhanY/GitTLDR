import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for meeting summaries (in production, use a real database)
const summaryStorage = new Map<string, string>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Get stored summary or return null
    const storedSummary = summaryStorage.get(meetingId);
    
    return NextResponse.json({ 
      summary: storedSummary || null
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
    
    // Store the updated summary
    summaryStorage.set(meetingId, summary);
    
    console.log(`Meeting ${meetingId} summary updated:`, { summary, type });
    
    return NextResponse.json({ 
      success: true, 
      summary,
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
