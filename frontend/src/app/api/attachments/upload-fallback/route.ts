import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { B2StorageService } from '@/lib/b2-storage';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const repositoryId = formData.get('repositoryId') as string;

    if (!file || !repositoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, repositoryId' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
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

    try {
      // Generate unique file name with timestamp
      const timestamp = Date.now();
      const uniqueFileName = `attachments/${repositoryId}/${timestamp}_${file.name}`;

      // Initialize B2 storage service
      const b2Service = new B2StorageService();
      
      // Get upload URL
      const uploadData = await b2Service.getUploadUrl(uniqueFileName, file.type);

      // Upload file to B2 with retry logic
      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-1', fileBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha1Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      let uploadResponse;
      let retries = 3;
      let delay = 1000; // Start with 1 second

      while (retries > 0) {
        try {
          uploadResponse = await fetch(uploadData.uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': uploadData.authorizationToken,
              'Content-Type': file.type,
              'X-Bz-File-Name': encodeURIComponent(uniqueFileName),
              'X-Bz-Content-Sha1': sha1Hash
            },
            body: fileBuffer,
          });

          if (uploadResponse.status !== 503) {
            break; // Success or other error, break
          }

          console.log(`B2 returned 503, retrying in ${delay}ms... (${retries - 1} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          retries--;
        } catch (fetchError) {
          console.error('Fetch error during upload:', fetchError);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
          } else {
            throw fetchError;
          }
        }
      }

      if (!uploadResponse || !uploadResponse.ok) {
        const errorText = uploadResponse ? await uploadResponse.text() : 'No response';
        throw new Error(`Upload failed after retries: ${uploadResponse?.status || 'unknown'} - ${errorText}`);
      }

      console.log('Server-side upload successful for file:', uniqueFileName);

      // Create attachment record
      const attachment = await prisma.questionAttachment.create({
        data: {
          fileName: uniqueFileName,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadUrl: uploadData.downloadUrl,
          repositoryId,
          uploadedBy: user.id,
        },
      });

      return NextResponse.json({
        id: attachment.id,
        fileName: attachment.fileName,
        originalFileName: attachment.originalFileName,
        fileSize: attachment.fileSize,
        fileType: attachment.fileType,
        downloadUrl: uploadData.downloadUrl,
        createdAt: attachment.createdAt,
      });

    } catch (error) {
      console.error('Failed to upload file:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in upload-fallback endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
