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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get Q&A history from database
    const qaItems = await prisma.meetingQA.findMany({
      where: {
        meetingId: meetingId,
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        question: true,
        answer: true,
        confidence: true,
        timestamp: true,
        relatedSegments: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      qaItems: qaItems.map(item => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        confidence: item.confidence || 0.8,
        timestamp: item.timestamp,
        relatedSegments: item.relatedSegments || [],
        createdAt: item.createdAt.toISOString()
      }))
    });

  } catch (error) {
    console.error('Q&A history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Q&A history' },
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
    const { question, answer, confidence, timestamp, relatedSegments, userId } = body;

    if (!question || !answer || !userId) {
      return NextResponse.json(
        { error: 'Question, answer, and user ID are required' },
        { status: 400 }
      );
    }

    // Create Q&A item in database
    const qaItem = await prisma.meetingQA.create({
      data: {
        meetingId,
        userId,
        question,
        answer,
        confidence: confidence || 0.8,
        timestamp: timestamp || null,
        relatedSegments: relatedSegments || []
      },
      select: {
        id: true,
        question: true,
        answer: true,
        confidence: true,
        timestamp: true,
        relatedSegments: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      qaItem: {
        id: qaItem.id,
        question: qaItem.question,
        answer: qaItem.answer,
        confidence: qaItem.confidence || 0.8,
        timestamp: qaItem.timestamp,
        relatedSegments: qaItem.relatedSegments || [],
        createdAt: qaItem.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Q&A store API error:', error);
    return NextResponse.json(
      { error: 'Failed to store Q&A' },
      { status: 500 }
    );
  }
}