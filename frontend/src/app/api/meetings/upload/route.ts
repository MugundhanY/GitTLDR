import { NextRequest, NextResponse } from 'next/server';
import { B2StorageService } from '@/lib/b2-storage';

// POST /api/meetings/upload - Server-side upload to B2
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const meetingId = formData.get('meetingId') as string;
    const title = formData.get('title') as string;
    const participants = formData.get('participants') as string;
    const userId = formData.get('userId') as string;

    if (!file || !meetingId || !userId) {
      return NextResponse.json(
        { error: 'File, meeting ID, and user ID are required' },
        { status: 400 }
      );
    }

    console.log('🔄 [SERVER UPLOAD] Processing file:', file.name, 'Size:', file.size);

    // Generate B2 file key following python-worker convention
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'wav';
    const b2FileKey = `meetings/${meetingId}.${fileExtension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('🔄 [SERVER UPLOAD] Uploading to B2:', b2FileKey);

    // Initialize B2 service and upload file
    const b2Service = new B2StorageService();
    
    // Upload file to B2
    const uploadResult = await b2Service.uploadFile(b2FileKey, buffer, file.type || 'audio/wav');

    console.log('✅ [SERVER UPLOAD] File uploaded successfully to B2');

    return NextResponse.json({
      success: true,
      b2FileKey,
      meetingId,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName
    });

  } catch (error) {
    console.error('❌ [SERVER UPLOAD] Upload failed:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
