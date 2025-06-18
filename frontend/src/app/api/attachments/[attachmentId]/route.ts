import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../../../../lib/auth';

const prisma = new PrismaClient();

// Helper function to handle token-based downloads (legacy support)
async function handleTokenBasedDownload(fileId: string, token: string, userId: string) {
  try {
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
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Try to fetch file content for direct download
    let fileBuffer: ArrayBuffer | null = null;
    
    // Try original upload URL first
    if (attachment.uploadUrl) {
      try {
        const fileResponse = await fetch(attachment.uploadUrl);
        if (fileResponse.ok) {
          fileBuffer = await fileResponse.arrayBuffer();
        }
      } catch (error) {
        console.warn('Failed to fetch from upload URL:', error);
      }
    }

    // If we have the file buffer, return it directly
    if (fileBuffer) {
      const headers = new Headers({
        'Content-Type': attachment.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.originalFileName || attachment.fileName}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
      });

      return new NextResponse(fileBuffer, {
        status: 200,
        headers
      });
    }

    // Fallback: return file info if direct download fails
    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      uploadUrl: attachment.uploadUrl,
      message: 'Direct download not available, use uploadUrl for download'
    });

  } catch (error) {
    console.error('Error in token-based download:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/attachments/[attachmentId] - Get attachment details or download with token
export async function GET(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  try {
    const { attachmentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    // Handle token-based download (legacy support)
    if (action === 'download' && token && userId) {
      return handleTokenBasedDownload(attachmentId, token, userId);
    }

    // Handle regular authenticated access
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const attachment = await prisma.questionAttachment.findFirst({
      where: {
        id: attachmentId
        // NOTE: We are not checking for uploadedBy here, as any user who can see the question
        // should be able to view the attachment. Deletion is still restricted.
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }// Generate a download URL for the file
    let downloadUrl = attachment.uploadUrl;
    
    // If it's a Backblaze B2 file, we might need to generate a temporary download URL
    if (attachment.backblazeFileId) {
      try {
        const response = await fetch(`${process.env.PYTHON_WORKER_URL}/get-download-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: attachment.backblazeFileId,
            file_name: attachment.fileName,
            userId: user.id
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Python worker response:', data);
          downloadUrl = data.download_url || attachment.uploadUrl;
        } else {
            const errorData = await response.text();
            console.error('Python worker failed:', response.status, errorData);
        }
      } catch (error) {
        console.warn('Failed to get download URL from Backblaze, using stored URL:', error);
      }
    }

    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      uploadUrl: attachment.uploadUrl,
      downloadUrl: downloadUrl,
      uploadedAt: attachment.createdAt.toISOString()
    });

  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/attachments/[attachmentId] - Delete attachment
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { attachmentId } = await params;

    const attachment = await prisma.questionAttachment.findFirst({
      where: {
        id: attachmentId,
        uploadedBy: user.id
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete from Backblaze B2 via Python worker
    if (attachment.backblazeFileId) {
      try {
        await fetch(`${process.env.PYTHON_WORKER_URL}/delete-attachment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: attachment.backblazeFileId,
            userId: user.id
          })
        });
      } catch (error) {
        console.warn('Failed to delete from Backblaze, continuing with DB deletion:', error);
      }
    }    // Delete from database
    await prisma.questionAttachment.delete({
      where: { id: attachmentId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}