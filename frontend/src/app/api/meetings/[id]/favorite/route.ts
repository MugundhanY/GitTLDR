import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Check if meeting is favorited by user
    const favorite = await prisma.meetingFavorite.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meetingId,
          userId: userId
        }
      }
    });
    
    const isFavorite = !!favorite;
    
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
    const { isFavorite, userId } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (isFavorite) {
      // Add to favorites
      await prisma.meetingFavorite.upsert({
        where: {
          meetingId_userId: {
            meetingId: meetingId,
            userId: userId
          }
        },
        update: {},
        create: {
          meetingId: meetingId,
          userId: userId
        }
      });
    } else {
      // Remove from favorites
      await prisma.meetingFavorite.deleteMany({
        where: {
          meetingId: meetingId,
          userId: userId
        }
      });
    }
    
    console.log(`Meeting ${meetingId} favorite status updated to: ${isFavorite} for user ${userId}`);
    
    return NextResponse.json({ 
      success: true, 
      isFavorite 
    });
  } catch (error) {
    console.error('Favorite update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update favorite status' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Remove from favorites
    await prisma.meetingFavorite.deleteMany({
      where: {
        meetingId: meetingId,
        userId: userId
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      isFavorite: false 
    });
  } catch (error) {
    console.error('Favorite deletion API error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}
