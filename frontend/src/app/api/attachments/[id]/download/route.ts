import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const fileId = params.id;

    if (!token || !userId || !fileId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify token (simple validation - decode and check components)
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
    }    // Get the file from B2 using the stored fileName path
    const b2BucketName = process.env.B2_BUCKET_NAME || 'gittldr';
    const directB2Url = `https://f003.backblazeb2.com/file/${b2BucketName}/${attachment.fileName}`;

    // Try to fetch and proxy the file
    try {
      const fileResponse = await fetch(directB2Url);
      
      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: 'File not accessible' },
          { status: 404 }
        );
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      
      // Return the file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': attachment.fileType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${attachment.originalFileName}"`,
          'Content-Length': fileBuffer.byteLength.toString()
        }
      });
    } catch (fetchError) {
      console.error('Error fetching file from B2:', fetchError);
      return NextResponse.json(
        { error: 'Unable to retrieve file' },
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
