import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { B2StorageService } from '@/lib/b2-storage';

const prisma = new PrismaClient();

// GET /api/repositories/[id]/files/[fileId]/content - Get file content from B2 storage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: repositoryId, fileId } = await params;

    // Verify repository ownership and get file info
    const file = await prisma.repositoryFile.findFirst({
      where: {
        id: fileId,
        repositoryId,
        repository: {
          userId: user.id,
        },
      },
      include: {
        repository: {
          select: {
            id: true,
            name: true,
            fullName: true,
          },
        },
      },
    });

    if (!file) {
      await prisma.$disconnect();
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // If file doesn't have content stored (no fileUrl or fileKey), return metadata only
    if (!file.fileUrl && !file.fileKey) {
      await prisma.$disconnect();
      return NextResponse.json({
        file: {
          id: file.id,
          name: file.name,
          path: file.path,
          type: file.type,
          size: file.size,
          language: file.language,
          summary: file.summary,
          hasContent: false,
        },
        content: null,
        message: 'File content not available in storage',
      });
    }    let content = null;
    let downloadUrl = null;

    // Try to get content using authenticated B2 access
    try {
      // Initialize B2 service for authenticated access
      const b2Service = new B2StorageService();
      
      // If we have a fileKey, use it for B2 access
      if (file.fileKey) {
        console.log('Fetching content using B2 fileKey:', file.fileKey);
        try {
          content = await b2Service.downloadFileContent(file.fileKey);
          console.log('Successfully fetched content from B2, length:', content.length);
          // Generate a temporary download URL for the file
          downloadUrl = await b2Service.getDownloadUrl(file.fileKey);
        } catch (b2Error: any) {
          console.error('B2 authenticated download failed:', b2Error.message);
          // Continue to try direct URL access as fallback
        }
      }

      // Fallback: If we have a direct file URL, try to fetch the content (for public files)
      if (!content && file.fileUrl) {
        try {
          console.log('Trying direct B2 URL access as fallback:', file.fileUrl);
          
          // For small text files, fetch content directly
          const isTextFile = file.name.toLowerCase() === 'dockerfile' || 
                            file.name.toLowerCase() === 'makefile' ||
                            file.name.toLowerCase() === 'readme' ||
                            file.name.toLowerCase().endsWith('.md') ||
                            file.name.toLowerCase().endsWith('.txt') ||
                            (file.language && [
                              'javascript', 'typescript', 'jsx', 'tsx', 'json', 'markdown', 'md',
                              'css', 'scss', 'less', 'html', 'xml', 'yaml', 'yml', 'toml',
                              'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php',
                              'ruby', 'swift', 'kotlin', 'scala', 'r', 'sql', 'shell', 'bash',
                              'dockerfile', 'gitignore', 'txt', 'log', 'config', 'ini', 'configuration'
                            ].includes(file.language.toLowerCase()));

          console.log('File type analysis:', {
            language: file.language,
            isTextFile,
            size: file.size
          });

          if (isTextFile && file.size < 1024 * 1024) { // Only fetch content for text files under 1MB
            const response = await fetch(file.fileUrl, {
              headers: {
                'User-Agent': 'GitTLDR-App/1.0'
              }
            });
            
            console.log('B2 direct response status:', response.status);
            if (response.ok) {
              content = await response.text();
              console.log('Successfully fetched content via direct URL, length:', content.length);
              downloadUrl = file.fileUrl;
            } else {
              console.error('B2 direct response not ok:', response.status, response.statusText);
            }
          }
        } catch (directError) {
          console.error('Direct URL access failed:', directError);
        }
      }

      // If still no content, set downloadUrl to the best available option
      if (!downloadUrl) {
        downloadUrl = file.fileUrl;
      }

    } catch (error) {
      console.error('Error in B2 content fetching:', error);
      downloadUrl = file.fileUrl; // Fallback to direct URL
    }

    await prisma.$disconnect();

    return NextResponse.json({
      file: {
        id: file.id,
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size,
        language: file.language,
        summary: file.summary,
        hasContent: true,
        downloadUrl,
      },
      content,
      repository: file.repository,
    });

  } catch (error) {
    console.error('Error fetching file content:', error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 }
    );
  }
}
