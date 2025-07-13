import { NextRequest, NextResponse } from 'next/server';
import { B2StorageService } from '@/lib/b2-storage';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get('id');
  const fileName = searchParams.get('fileName');

  if (!meetingId || typeof meetingId !== 'string') {
    return NextResponse.json({ error: 'Meeting ID is required and must be a string' }, { status: 400 });
  }

  if (!fileName || typeof fileName !== 'string') {
    return NextResponse.json({ error: 'File name is required and must be a string' }, { status: 400 });
  }

  const b2Service = new B2StorageService();

  try {
    await b2Service.authorize();

    const data = await b2Service.downloadFileContent(fileName);

    console.log('File Name:', fileName);
    console.log('Response Headers:', {
      'Content-Type': 'audio/mpeg',
    });
    console.log('Audio Data:', data);
    console.log('Meeting ID:', meetingId);

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error downloading audio file:', error);
    return NextResponse.json({ error: 'Failed to download audio file' }, { status: 500 });
  }
}
