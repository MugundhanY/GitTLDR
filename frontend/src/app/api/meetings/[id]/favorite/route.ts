import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for favorites (in production, use a real database)
const favoriteStorage = new Map<string, boolean>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    
    // Check if meeting is favorited (defaults to false if not found)
    const isFavorite = favoriteStorage.get(meetingId) || false;
    
    return NextResponse.json({ isFavorite });
  } catch (error) {
    console.error('Favorite status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite status' },
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
    const { isFavorite } = body;
    
    // Store favorite status
    favoriteStorage.set(meetingId, isFavorite);
    
    console.log(`Meeting ${meetingId} favorite status updated to: ${isFavorite}`);
    
    return NextResponse.json({ 
      success: true, 
      isFavorite 
    });
  } catch (error) {
    console.error('Update favorite API error:', error);
    return NextResponse.json(
      { error: 'Failed to update favorite status' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all favorited meetings for filtering
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Return all favorited meeting IDs for filtering
    const favoritedMeetings = Array.from(favoriteStorage.entries())
      .filter(([_, isFavorite]) => isFavorite)
      .map(([meetingId, _]) => meetingId);
      
    return NextResponse.json({ favoritedMeetings });
  } catch (error) {
    console.error('Favorited meetings API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorited meetings' },
      { status: 500 }
    );
  }
}
