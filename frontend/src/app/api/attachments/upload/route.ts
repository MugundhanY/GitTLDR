import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { B2StorageService } from '@/lib/b2-storage';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UploadRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  repositoryId: string;
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

    const { fileName, fileSize, fileType, repositoryId }: UploadRequest = await request.json();

    if (!fileName || !fileSize || !fileType || !repositoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, fileType, repositoryId' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxFileSize) {
      return NextResponse.json(
        { error: `File size too large. Maximum size is ${maxFileSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Verify repository exists and user has access
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: user.id,
      },
    });

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository not found or access denied' },
        { status: 404 }
      );
    }

    // Generate unique file name with timestamp
    const timestamp = Date.now();
    const uniqueFileName = `attachments/${repositoryId}/${timestamp}_${fileName}`;

    try {
      // Initialize B2 storage service
      const b2Service = new B2StorageService();
      
      // Get pre-signed upload URL from B2
      const uploadData = await b2Service.getUploadUrl(uniqueFileName, fileType);

      console.log('Generated upload URL for file:', {
        originalName: fileName,
        uniqueName: uniqueFileName,
        size: fileSize,
        type: fileType
      });

      // Create attachment record in pending state
      const attachment = await prisma.questionAttachment.create({
        data: {
          fileName: uniqueFileName,
          originalFileName: fileName,
          fileSize,
          fileType,
          uploadUrl: uploadData.downloadUrl,
          repositoryId,
          uploadedBy: user.id,
        },
      });

      return NextResponse.json({
        uploadUrl: uploadData.uploadUrl,
        authorizationToken: uploadData.authorizationToken,
        fileName: uniqueFileName,
        downloadUrl: uploadData.downloadUrl,
        attachmentId: attachment.id,
      });

    } catch (error) {
      console.error('Failed to generate upload URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate upload URL' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in upload endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}