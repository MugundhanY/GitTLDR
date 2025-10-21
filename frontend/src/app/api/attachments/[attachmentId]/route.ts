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

    // Fetch file from B2 with proper authentication and proxy it
    if (attachment.fileName) {
      try {
        console.log(`Downloading file from B2: ${attachment.fileName}`);
        
        // Import B2 storage service
        const { B2StorageService } = await import('@/lib/b2-storage');
        const b2Storage = new B2StorageService();
        
        // Download file buffer from B2 with authentication
        const fileBuffer = await b2Storage.downloadFileBuffer(attachment.fileName);
        console.log(`Successfully fetched file, size: ${fileBuffer.byteLength} bytes`);

        // Return file with proper headers
        // Force CSV files to display as text/plain so browsers preview instead of download
        let contentType = attachment.fileType || 'application/octet-stream';
        if (contentType.includes('csv')) {
          contentType = 'text/plain; charset=utf-8';
        }
        
        const headers = new Headers({
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalFileName || attachment.fileName)}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Access-Control-Allow-Origin': '*', // Allow cross-origin for previews
        });

        return new NextResponse(fileBuffer, {
          status: 200,
          headers
        });
      } catch (error) {
        console.error('Error downloading file from B2:', error);
        return NextResponse.json({
          error: 'Failed to load file from storage',
          details: error instanceof Error ? error.message : 'Unknown error',
          fileId: attachment.id,
          fileName: attachment.originalFileName
        }, { status: 500 });
      }
    }

    // If no uploadUrl available, return error
    return NextResponse.json({
      error: 'File URL not available',
      id: attachment.id,
      fileName: attachment.fileName,
      originalFileName: attachment.originalFileName,
    }, { status: 404 });

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