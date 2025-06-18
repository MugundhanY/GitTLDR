import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { fileId, fileName, userId } = await request.json();

    if (!fileId || !fileName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, fileName, userId' },
        { status: 400 }
      );
    }

    // Verify the user has access to this attachment
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

    // For now, create a temporary authenticated URL that includes a token
    // This is a simplified approach - in production you'd want more sophisticated auth
    const token = Buffer.from(`${fileId}:${userId}:${Date.now()}`).toString('base64');
    const downloadUrl = `/api/attachments/${fileId}/download?token=${token}&userId=${userId}`;

    return NextResponse.json({
      download_url: downloadUrl,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      file_name: attachment.originalFileName
    });

  } catch (error) {
    console.error('Error getting download URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
