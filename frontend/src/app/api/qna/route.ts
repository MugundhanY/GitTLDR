import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/qna - Ask a question about a repository
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repositoryId, userId, question } = body;

    if (!repositoryId || !userId || !question) {
      return NextResponse.json(
        { error: 'Repository ID, user ID, and question are required' },
        { status: 400 }
      );
    }    // Create question record in database using Prisma
    // We'll create it after processing since it requires an answer
    const questionId = Date.now().toString();

    // Send processing request to Node.js worker
    const workerResponse = await fetch(`${process.env.NODE_WORKER_URL}/process-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: questionId,
        repositoryId,
        userId,
        question
      })
    });

    if (!workerResponse.ok) {
      throw new Error('Failed to queue question processing');
    }

    const workerResult = await workerResponse.json();    return NextResponse.json({
      questionId: questionId,
      jobId: workerResult.jobId,
      status: 'processing'
    });

  } catch (error) {
    console.error('Error processing question:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}

// GET /api/qna - Get Q&A history for a repository
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const userId = searchParams.get('userId');

    if (!repositoryId || !userId) {
      return NextResponse.json(
        { error: 'Repository ID and user ID are required' },
        { status: 400 }
      );
    }

    // TODO: Fetch Q&A history from database using Prisma
    // For now, return mock data
    const qnaHistory = [
      {
        id: '1',
        question: 'What does this repository do?',
        answer: 'This repository is a GitTLDR application that provides AI-powered summaries and Q&A for GitHub repositories.',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'completed'
      },
      {
        id: '2',
        question: 'How do I set up the development environment?',
        answer: 'To set up the development environment, follow these steps: 1. Clone the repository, 2. Install dependencies with npm install, 3. Set up environment variables, 4. Run npm run dev.',
        createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        status: 'completed'
      }
    ];

    return NextResponse.json({ qnaHistory });

  } catch (error) {
    console.error('Error fetching Q&A history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Q&A history' },
      { status: 500 }
    );
  }
}
