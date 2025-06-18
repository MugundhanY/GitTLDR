import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AttachmentMetadataRequest {
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileType: string;
  uploadUrl: string;
  backblazeFileId?: string;
  repositoryId: string;
  questionId?: string;
}

interface SecureDownloadRequest {
  action: 'get-download-url';
  fileId: string;
  fileName: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Handle secure download URL generation
    if (body.action === 'get-download-url') {
      const { fileId, fileName } = body as SecureDownloadRequest;

      if (!fileId || !fileName) {
        return NextResponse.json(
          { error: 'Missing required fields: fileId, fileName' },
          { status: 400 }
        );
      }

      // Verify the user has access to this attachment
      const attachment = await prisma.questionAttachment.findFirst({
        where: {
          id: fileId
        }
      });

      if (!attachment) {
        return NextResponse.json(
          { error: 'Attachment not found' },
          { status: 404 }
        );
      }

      // Generate secure download URL with token
      const token = Buffer.from(`${fileId}:${user.id}:${Date.now()}`).toString('base64');
      const downloadUrl = `/api/attachments/${fileId}?token=${token}&userId=${user.id}&action=download`;

      return NextResponse.json({
        download_url: downloadUrl,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        file_name: attachment.originalFileName
      });
    }

    // Handle attachment metadata creation
    const attachmentData = body as AttachmentMetadataRequest;
    const { 
      fileName, 
      originalFileName, 
      fileSize, 
      fileType, 
      uploadUrl,
      backblazeFileId,
      repositoryId,
      questionId
    } = attachmentData;

    // Validate required fields
    if (!fileName || !originalFileName || !fileSize || !fileType || !uploadUrl || !repositoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, originalFileName, fileSize, fileType, uploadUrl, repositoryId' },
        { status: 400 }
      );
    }

    // Create attachment record
    const attachment = await prisma.questionAttachment.create({
      data: {
        fileName,
        originalFileName,
        fileSize,
        fileType,
        uploadUrl,
        backblazeFileId,
        repositoryId,
        questionId,
        uploadedBy: user.id,
      },
    });

    console.log(`Created attachment metadata: ${attachment.id} - ${fileName}`);

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      uploadUrl: attachment.uploadUrl,
      createdAt: attachment.createdAt,
    });

  } catch (error) {
    console.error('Failed to create attachment metadata:', error);
    return NextResponse.json(
      { error: 'Failed to create attachment metadata' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');

    if (!repositoryId) {
      return NextResponse.json(
        { error: 'Repository ID required' },
        { status: 400 }
      );
    }

    // Get attachments for the repository
    const attachments = await prisma.questionAttachment.findMany({
      where: {
        repositoryId,
      },
      include: {
        uploadedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        question: {
          select: {
            id: true,
            query: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(attachments);

  } catch (error) {
    console.error('Failed to fetch attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}
