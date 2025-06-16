import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/qna/search - Advanced search with confidence level filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');
    const userId = searchParams.get('userId');
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';
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

    // Text search across query and answer
    if (query.trim()) {
      whereClause.OR = [
        { query: { contains: query, mode: 'insensitive' } },
        { answer: { contains: query, mode: 'insensitive' } }
      ];
    }

    // Category filter
    if (category) {
      whereClause.category = category;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      whereClause.tags = {
        hasEvery: tags
      };
    }

    // Favorites filter
    if (favoritesOnly) {
      whereClause.isFavorite = true;
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

    // Fetch filtered questions
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        repository: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { confidenceScore: 'desc' }, // Order by confidence first
        { createdAt: 'desc' }
      ],
      take: 100
    });

    // Transform questions for frontend
    const searchResults = questions.map(question => ({
      id: question.id,
      query: question.query,
      answer: question.answer,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
      status: 'completed',
      repositoryId: question.repositoryId,
      repositoryName: question.repository?.name || '',
      confidence: question.confidenceScore,
      relevantFiles: question.relevantFiles as string[],
      isFavorite: question.isFavorite,
      tags: question.tags,
      category: question.category,
      notes: question.notes
    }));

    await prisma.$disconnect();
    return NextResponse.json({ 
      questions: searchResults,
      totalCount: searchResults.length,
      filters: {
        query,
        category,
        tags,
        favoritesOnly,
        minConfidence: minConfidence ? parseFloat(minConfidence) : null,
        maxConfidence: maxConfidence ? parseFloat(maxConfidence) : null
      }
    });

  } catch (error) {
    console.error('Error searching Q&A:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to search Q&A' },
      { status: 500 }
    );
  }
}