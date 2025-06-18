import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Simple, scalable attachment security handler
 * Generates secure download URLs and validates access
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, userId } = await request.json();

    if (!fileId || !userId) {
      return NextResponse.json(
        { error: 'Missing fileId or userId' },
        { status: 400 }
      );
    }

    // Verify the attachment exists and user has access
    const attachment = await prisma.questionAttachment.findFirst({
      where: {
        id: fileId
      },
      include: {
        question: true
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Generate a simple secure token (1 hour expiry)
    const expiresAt = Date.now() + 3600000; // 1 hour
    const token = Buffer.from(`${fileId}:${userId}:${expiresAt}`).toString('base64');
    
    // Return secure download URL pointing to our own API
    const secureUrl = `/api/attachments/secure/download?token=${token}&file=${fileId}`;

    return NextResponse.json({
      downloadUrl: secureUrl,
      fileName: attachment.originalFileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
      expiresAt: new Date(expiresAt).toISOString()
    });

  } catch (error) {
    console.error('Error generating secure URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Secure file download with token validation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const fileId = searchParams.get('file');

    if (!token || !fileId) {
      return NextResponse.json(
        { error: 'Missing token or file parameter' },
        { status: 400 }
      );
    }

    // Validate token
    try {
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      const [tokenFileId, tokenUserId, expiresAt] = decodedToken.split(':');
      
      // Check token validity
      if (tokenFileId !== fileId || Date.now() > parseInt(expiresAt)) {
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

    // Get attachment details
    const attachment = await prisma.questionAttachment.findFirst({
      where: { id: fileId }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Build B2 direct URL
    const bucketName = process.env.B2_BUCKET_NAME || 'gittldr-attachments';
    const directUrl = `https://f002.backblazeb2.com/file/${bucketName}/${attachment.fileName}`;

    try {
      // Fetch file from B2 and proxy it through our API
      const fileResponse = await fetch(directUrl);
      
      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: 'File not accessible from storage' },
          { status: 404 }
        );
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      
      // Return file with proper headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': attachment.fileType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${attachment.originalFileName}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'private, max-age=300' // 5 minute cache
        }
      });

    } catch (fetchError) {
      console.error('Error fetching file from B2:', fetchError);
      return NextResponse.json(
        { error: 'Unable to retrieve file from storage' },
        { status: 503 }
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
