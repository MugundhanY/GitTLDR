import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/qna - Ask a question about a repository
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repositoryId, userId, question, attachments } = body;

    if (!repositoryId || !userId || !question) {
      return NextResponse.json(
        { error: 'Repository ID, user ID, and question are required' },
        { status: 400 }
      );
    }    // Create question record in database using Prisma
    // We'll create it after processing since it requires an answer
    const questionId = Date.now().toString();

    // Create pending question record with attachments if provided
    if (attachments && attachments.length > 0) {
      try {
        await prisma.question.create({
          data: {
            id: questionId,
            query: question,
            answer: '', // Will be filled when processing completes
            confidenceScore: 0,
            relevantFiles: [],
            userId: userId,
            repositoryId: repositoryId,
            createdAt: new Date(),            questionAttachments: {
              create: attachments.map((attachment: any) => ({
                fileName: attachment.fileName,
                originalFileName: attachment.originalFileName,
                fileSize: attachment.fileSize,
                fileType: attachment.fileType,
                uploadUrl: attachment.uploadUrl,
                backblazeFileId: attachment.backblazeFileId,
                uploadedBy: userId, // Link attachment to the user who uploaded it
                repositoryId: repositoryId, // Link attachment to the repository
                createdAt: new Date()
              }))
            }
          }
        });
        console.log(`✅ Created pending question with ${attachments.length} attachments: ${questionId}`);
      } catch (error) {
        console.error('Error creating pending question with attachments:', error);
        // Continue with processing even if pending creation fails
      }
    }    // Send processing request to Node.js worker
    const workerResponse = await fetch(`${process.env.NODE_WORKER_URL}/process-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionId: questionId,
        repositoryId,
        userId,
        question,
        attachments: attachments || []
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
export async function GET(request: NextRequest) {  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const userId = searchParams.get('userId');
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const minConfidence = searchParams.get('minConfidence');
    const maxConfidence = searchParams.get('maxConfidence');

    if (!repositoryId || !userId) {
      return NextResponse.json(
        { error: 'Repository ID and user ID are required' },
        { status: 400 }
      );
    }

    // Build where clause with filters
    const whereClause: any = {
      repositoryId,
      userId,
    };

    if (favoritesOnly) {
      whereClause.isFavorite = true;
    }

    if (category) {
      whereClause.category = category;
    }    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasEvery: tags
      };
    }

    // Confidence level filtering
    if (minConfidence !== null || maxConfidence !== null) {
      whereClause.confidenceScore = {};
      
      if (minConfidence !== null) {
        const minConf = parseFloat(minConfidence);
        if (!isNaN(minConf)) {
          whereClause.confidenceScore.gte = minConf;
        }
      }
      
      if (maxConfidence !== null) {
        const maxConf = parseFloat(maxConfidence);
        if (!isNaN(maxConf)) {
          whereClause.confidenceScore.lte = maxConf;
        }
      }
    }

    // Fetch Q&A history from database using Prisma
    const questions = await prisma.question.findMany({
      where: whereClause,      include: {
        repository: {
          select: {
            name: true
          }
        },
        questionAttachments: {
          select: {
            id: true,
            fileName: true,
            originalFileName: true,
            fileSize: true,
            fileType: true,
            uploadUrl: true,
            backblazeFileId: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { confidenceScore: 'desc' }, // Order by confidence first
        { createdAt: 'desc' }
      ],
      take: 100 // Increased limit for better history access
    });    // Transform questions for frontend
    const qnaHistory = questions.map(question => ({
      id: question.id,
      query: question.query,
      answer: question.answer,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
      status: 'completed', // All stored questions are completed
      repositoryId: question.repositoryId,
      repositoryName: question.repository?.name || '',
      confidence: question.confidenceScore,
      relevantFiles: Array.isArray(question.relevantFiles) 
        ? question.relevantFiles.filter((file): file is string => typeof file === 'string')
        : [],
      isFavorite: question.isFavorite,
      tags: question.tags,
      category: question.category,
      questionAttachments: question.questionAttachments?.map(attachment => ({
        id: attachment.id,
        fileName: attachment.fileName,
        originalFileName: attachment.originalFileName,
        fileSize: attachment.fileSize,
        fileType: attachment.fileType,
        uploadUrl: attachment.uploadUrl,
        backblazeFileId: attachment.backblazeFileId,
        createdAt: attachment.createdAt.toISOString()
      })) || [],
      notes: question.notes
    }));

    await prisma.$disconnect();
    return NextResponse.json({ questions: qnaHistory });

  } catch (error) {
    console.error('Error fetching Q&A history:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to fetch Q&A history' },
      { status: 500 }
    );
  }
}

// PATCH /api/qna - Update question metadata (favorite, tags, notes, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, isFavorite, tags, category, notes, userId } = body;

    if (!questionId || !userId) {
      return NextResponse.json(
        { error: 'Question ID and user ID are required' },
        { status: 400 }
      );
    }

    // Verify the question belongs to the user
    const existingQuestion = await prisma.question.findFirst({
      where: {
        id: questionId,
        userId: userId,
      }
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found or access denied' },
        { status: 404 }
      );
    }

    // Update the question
    const updatedQuestion = await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        ...(isFavorite !== undefined && { isFavorite }),
        ...(tags !== undefined && { tags }),
        ...(category !== undefined && { category }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      },
      include: {
        repository: {
          select: {
            name: true
          }
        }
      }
    });

    const response = {
      id: updatedQuestion.id,
      query: updatedQuestion.query,
      answer: updatedQuestion.answer,
      createdAt: updatedQuestion.createdAt.toISOString(),
      updatedAt: updatedQuestion.updatedAt.toISOString(),
      status: 'completed',
      repositoryId: updatedQuestion.repositoryId,
      repositoryName: updatedQuestion.repository?.name || '',
      confidence: updatedQuestion.confidenceScore,
      relevantFiles: Array.isArray(updatedQuestion.relevantFiles) 
        ? updatedQuestion.relevantFiles.filter((file): file is string => typeof file === 'string')
        : [],
      isFavorite: updatedQuestion.isFavorite,
      tags: updatedQuestion.tags,
      category: updatedQuestion.category,
      notes: updatedQuestion.notes
    };

    await prisma.$disconnect();
    return NextResponse.json({ question: response });

  } catch (error) {
    console.error('Error updating question:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}
