import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { B2StorageService } from '@/lib/b2-storage';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { attachmentId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const fileId = params.attachmentId;

    if (action !== 'download' || !token || !userId || !fileId) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // Verify token
    try {
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      const [tokenFileId, tokenUserId, timestamp] = decodedToken.split(':');
      
      // Check if token matches and hasn't expired (1 hour = 3600000ms)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenFileId !== fileId || tokenUserId !== userId || tokenAge > 3600000) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 403 }
      );
    }

    // Get attachment from database
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
    }    // Try to fetch file using authenticated B2 access (same pattern as files page)
    let fileBuffer: ArrayBuffer | null = null;
    
    try {
      // Initialize B2 service for authenticated access
      const b2Service = new B2StorageService();
        // Use fileName (which is the B2 file key) for authenticated access
      if (attachment.fileName) {
        console.log('Fetching attachment using B2 fileName:', attachment.fileName);
        try {
          // Use downloadFileBuffer for binary files
          fileBuffer = await b2Service.downloadFileBuffer(attachment.fileName);
          console.log('Successfully fetched attachment from B2, buffer length:', fileBuffer.byteLength);
        } catch (b2Error: any) {
          console.error('B2 authenticated download failed:', b2Error.message);
          // Continue to try direct URL access as fallback
        }
      }

      // Fallback: Try direct B2 URL access if authenticated access failed
      if (!fileBuffer && attachment.uploadUrl) {
        try {
          console.log('Trying direct B2 URL access as fallback:', attachment.uploadUrl);
          const fileResponse = await fetch(attachment.uploadUrl);
          
          if (fileResponse.ok) {
            fileBuffer = await fileResponse.arrayBuffer();
            console.log('Successfully fetched attachment via direct URL, buffer length:', fileBuffer.byteLength);
          } else {
            console.error('Direct B2 response not ok:', fileResponse.status, fileResponse.statusText);
          }
        } catch (directError) {
          console.error('Direct URL access failed:', directError);
        }
      }

      // If still no file, try constructing B2 URL
      if (!fileBuffer) {
        const b2BucketName = process.env.B2_BUCKET_NAME || 'gittldr-attachments';
        const directB2Url = `https://f002.backblazeb2.com/file/${b2BucketName}/${attachment.fileName}`;
        console.log('Trying constructed B2 URL:', directB2Url);
        
        try {
          const fileResponse = await fetch(directB2Url);
          
          if (fileResponse.ok) {
            fileBuffer = await fileResponse.arrayBuffer();
            console.log('Successfully fetched attachment via constructed URL, buffer length:', fileBuffer.byteLength);
          } else {
            console.error('Constructed B2 URL response not ok:', fileResponse.status, fileResponse.statusText);
          }
        } catch (constructedError) {
          console.error('Constructed URL access failed:', constructedError);
        }
      }      if (!fileBuffer) {
        console.error('Failed to retrieve file from all methods:', {
          attachmentId: fileId,
          fileName: attachment.fileName,
          uploadUrl: attachment.uploadUrl,
          fileType: attachment.fileType,
          originalFileName: attachment.originalFileName
        });
        return NextResponse.json(
          { error: 'File not accessible from storage' },
          { status: 404 }
        );
      }      console.log('Successfully retrieved file:', {
        attachmentId: fileId,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        bufferSize: fileBuffer.byteLength
      });      // Sanitize filename for HTTP headers (remove/replace problematic characters)
      const sanitizedFileName = attachment.originalFileName
        ?.replace(/[^\x00-\x7F]/g, '_') // Replace non-ASCII characters with underscore
        ?.replace(/[<>:"/\\|?*]/g, '_') // Replace illegal filename characters
        ?.replace(/"/g, "'") // Replace double quotes with single quotes
        || 'attachment.bin';

      console.log('Original filename:', attachment.originalFileName);
      console.log('Sanitized filename:', sanitizedFileName);

      // Create Content-Disposition header with proper encoding
      const contentDisposition = `attachment; filename="${sanitizedFileName}"; filename*=UTF-8''${encodeURIComponent(attachment.originalFileName || sanitizedFileName)}`;

      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': attachment.fileType || 'application/octet-stream',
          'Content-Disposition': contentDisposition,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'private, max-age=3600' // Cache for 1 hour
        }
      });

    } catch (error) {
      console.error('Error in attachment download:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        attachmentId: fileId,
        fileName: attachment?.fileName,
        fileType: attachment?.fileType
      });
      return NextResponse.json(
        { error: 'Unable to retrieve file', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in secure download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
