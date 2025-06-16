import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/repositories/[id]/files - Get files for a repository
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }    const { id: repositoryId } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';
    const search = searchParams.get('search') || '';
    const language = searchParams.get('language') || '';
    const searchInSummaries = searchParams.get('searchInSummaries') === 'true';
    const getContent = searchParams.get('content') === 'true';    // If requesting content for a specific file
    if (getContent && path !== '/') {
      // Find the specific file
      const file = await prisma.repositoryFile.findFirst({
        where: {
          repositoryId,
          path: path
        },
        select: {
          id: true,
          path: true,
          name: true,
          type: true,
          size: true,
          language: true,
          fileUrl: true,
          fileKey: true
        }
      });

      if (!file) {
        await prisma.$disconnect();
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Try to fetch content from external storage
      let content = 'File content not available';
      
      if (file.fileUrl) {
        try {
          const response = await fetch(file.fileUrl);
          if (response.ok) {
            content = await response.text();
          }
        } catch (error) {
          console.error('Error fetching file content from URL:', error);
        }
      }

      // Return file with content
      const response = {
        path: file.path,
        name: file.name,
        content: content,
        language: file.language || 'text',
        size: file.size || 0,
        type: file.type || 'file'
      };

      await prisma.$disconnect();
      return NextResponse.json(response);
    }

    // Verify repository ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id,
      },
    });

    if (!repository) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    // Check if repository has any files at all for debugging
    const totalFileCount = await prisma.repositoryFile.count({
      where: { repositoryId }
    });
    console.log(`Repository ${repositoryId} has ${totalFileCount} total files in database`);
    console.log(`Repository status: ${repository.embeddingStatus}, processed: ${repository.processed}`);

    // Build where conditions for file filtering
    const whereConditions: any = {
      repositoryId,
    };    // Add search filter if provided
    if (search) {
      if (searchInSummaries) {
        // Search in both name and summary when explicitly requested
        whereConditions.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } }
        ];
      } else {
        // Default: only search in filename
        whereConditions.name = { contains: search, mode: 'insensitive' };
      }
    }

    // Add language filter if provided
    if (language && language !== 'all') {
      whereConditions.language = language;
    }

    // Fetch all files from database - let the frontend handle folder structure
    const allFiles = await prisma.repositoryFile.findMany({
      where: whereConditions,
      select: {
        id: true,
        path: true,
        name: true,
        type: true,
        size: true,
        language: true,
        summary: true,
        fileUrl: true,
        fileKey: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { type: 'asc' }, // Directories first
        { name: 'asc' }  // Then alphabetical
      ]
    });

    console.log(`Found ${allFiles.length} files for repository ${repositoryId}`);

    // Get file statistics for all files in repository
    const stats = await prisma.repositoryFile.aggregate({
      where: { repositoryId },
      _count: {
        id: true,
      },
      _sum: {
        size: true,
      },
    });

    // Get language distribution
    const languageStats = await prisma.repositoryFile.groupBy({
      by: ['language'],
      where: {
        repositoryId,
        language: { not: null },
      },
      _count: {
        language: true,
      },
    });

    // Transform files for frontend
    const transformedFiles = allFiles.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type as 'file' | 'dir',
      size: file.size,
      language: file.language,
      summary: file.summary,
      fileUrl: file.fileUrl,
      hasContent: !!file.fileUrl || !!file.fileKey,
      lastModified: file.updatedAt.toISOString(),
    }));

    // Calculate directory structure for breadcrumbs based on current path
    const pathParts = path === '/' ? [] : path.split('/').filter(Boolean);
    const breadcrumbs = [
      { name: repository.name, path: '/' },
      ...pathParts.map((part, index) => ({
        name: part,
        path: '/' + pathParts.slice(0, index + 1).join('/'),
      })),
    ];

    await prisma.$disconnect();

    return NextResponse.json({
      files: transformedFiles,
      stats: {
        totalFiles: stats._count.id || 0,
        totalSize: stats._sum.size || 0,
        totalDirectories: 0, // Will be calculated by frontend based on file paths
        languages: languageStats.map(lang => ({
          name: lang.language,
          count: lang._count.language,
        })),
      },
      breadcrumbs,
      currentPath: path,
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.fullName,
        description: repository.description,
        status: repository.embeddingStatus,
        processed: repository.processed,
        isProcessing: repository.embeddingStatus === 'PENDING' || repository.embeddingStatus === 'PROCESSING',
      },
    });

  } catch (error) {
    console.error('Error fetching repository files:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to fetch repository files' },
      { status: 500 }
    );
  }
}
