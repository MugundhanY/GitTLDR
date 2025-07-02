import { B2StorageService } from '@/lib/b2-storage';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const fileKey = request.nextUrl.searchParams.get('fileKey') || 'meetings/meeting_1751461720950_twlur5oyb.wav';
    
    console.log('Testing B2 file access for:', fileKey);
    
    const b2Service = new B2StorageService();
    
    // Test authorization
    console.log('Testing B2 authorization...');
    await b2Service.authorize();
    console.log('✅ B2 authorization successful');
    
    // Test file download
    console.log('Testing file download...');
    const buffer = await b2Service.downloadFileBuffer(fileKey);
    console.log('✅ File download successful, size:', buffer.byteLength);
    
    return NextResponse.json({
      success: true,
      fileKey,
      fileSize: buffer.byteLength,
      message: 'File access test successful'
    });
    
  } catch (error) {
    console.error('❌ B2 test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'File access test failed'
    }, { status: 500 });
  }
}
