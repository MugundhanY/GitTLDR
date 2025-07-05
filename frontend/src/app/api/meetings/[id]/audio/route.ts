import { B2StorageService } from '@/lib/b2-storage';
import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      );
    }

    // Fetch raw_audio_path from the database
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { raw_audio_path: true },
    });

    if (!meeting || !meeting.raw_audio_path) {
      return NextResponse.json(
        { error: 'Audio file path not found' },
        { status: 404 }
      );
    }

    console.log('Database raw_audio_path:', meeting.raw_audio_path);

    const b2Service = new B2StorageService();
    let audioBuffer = null;

    // Try to generate signed URL and download file
    try {
      console.log('Attempting to generate signed URL for file:', meeting.raw_audio_path);
      const signedUrl = await b2Service.getSignedDownloadUrl(meeting.raw_audio_path, 3600);
      console.log('Signed URL generated successfully');

      const audioResponse = await fetch(signedUrl);
      console.log('Audio Response Status:', audioResponse.status);

      if (audioResponse.ok) {
        audioBuffer = await audioResponse.arrayBuffer();
        console.log('Successfully fetched audio via signed URL, buffer length:', audioBuffer.byteLength);
      } else {
        console.error('Failed to fetch audio file via signed URL:', audioResponse.status);
        throw new Error(`Signed URL fetch failed: ${audioResponse.status}`);
      }
    } catch (signedUrlError) {
      console.error('Signed URL approach failed:', signedUrlError);
      
      // Fallback: Try direct download with auth token
      try {
        console.log('Attempting direct download with auth token');
        audioBuffer = await b2Service.downloadFileBuffer(meeting.raw_audio_path);
        console.log('Successfully fetched audio via direct download, buffer length:', audioBuffer.byteLength);
      } catch (directError) {
        console.error('Direct download failed:', directError);
        
        // Final fallback: Try constructed URL
        const directB2Url = `https://f003.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${meeting.raw_audio_path}`;
        console.log('Trying constructed B2 URL as final fallback:', directB2Url);

        try {
          const fileResponse = await fetch(directB2Url);

          if (fileResponse.ok) {
            audioBuffer = await fileResponse.arrayBuffer();
            console.log('Successfully fetched audio via constructed URL, buffer length:', audioBuffer.byteLength);
          } else {
            console.error('Constructed B2 URL response not ok:', fileResponse.status, fileResponse.statusText);
          }
        } catch (constructedError) {
          console.error('Constructed URL access failed:', constructedError);
        }
      }
    }

    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to fetch audio file' },
        { status: 500 }
      );
    }

    // Determine content type based on file extension
    const fileExtension = meeting.raw_audio_path.toLowerCase().split('.').pop();
    let contentType = 'audio/mpeg'; // default
    
    if (fileExtension === 'wav') {
      contentType = 'audio/wav';
    } else if (fileExtension === 'mp3') {
      contentType = 'audio/mpeg';
    } else if (fileExtension === 'm4a') {
      contentType = 'audio/mp4';
    } else if (fileExtension === 'ogg') {
      contentType = 'audio/ogg';
    }

    console.log('Serving audio file with content type:', contentType);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Meeting audio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
