import { NextRequest, NextResponse } from 'next/server';
import { B2StorageService } from '@/lib/b2-storage';

// POST /api/meetings/upload-url - Get pre-signed upload URL for meeting audio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, filename, title, participants, userId } = body;

    if (!meetingId || !filename || !userId) {
      return NextResponse.json(
        { error: 'Meeting ID, filename, and user ID are required' },
        { status: 400 }
      );
    }

    // Generate B2 file key following python-worker convention: meetings/{meetingId}.{ext}
    const fileExtension = filename.split('.').pop()?.toLowerCase() || 'wav';
    const b2FileKey = `meetings/${meetingId}.${fileExtension}`;

    console.log('Generating upload URL for meeting:', { meetingId, b2FileKey, userId });

    // Initialize B2 service and get upload URL
    const b2Service = new B2StorageService();
    
    // Use the meeting audio bucket from settings (should match python-worker config)
    const bucketName = process.env.B2_MEETING_AUDIO_BUCKET || 'gittldr-meeting-audio';
    
    // Get upload URL for the specific file key
    const uploadData = await b2Service.getUploadUrl(b2FileKey, 'audio/wav');

    return NextResponse.json({
      uploadUrl: uploadData.uploadUrl,
      fields: {
        'Authorization': uploadData.authorizationToken,
        'X-Bz-File-Name': b2FileKey,
        'Content-Type': 'audio/wav'
      },
      b2FileKey,
      meetingId
    });

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
