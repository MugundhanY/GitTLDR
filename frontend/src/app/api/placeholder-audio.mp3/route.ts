import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Generate a proper silent MP3 file (about 5 seconds of silence)
  // This is a valid MP3 header with MPEG-1 Layer III, 128kbps, 44.1kHz, Stereo
  const mp3Data = Buffer.from([
    // MP3 Header
    0xFF, 0xFB, 0x90, 0x00, // Sync word + MPEG-1 Layer III + 128kbps + 44.1kHz
    
    // Side information (32 bytes)
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    
    // Main data (silence - all zeros for remainder of frame)
    ...Array(384 - 36).fill(0)
  ]);

  // Repeat this frame several times to create a longer silent audio
  const frames = 200; // About 5 seconds
  const fullMp3 = Buffer.concat(Array(frames).fill(mp3Data));

  return new NextResponse(fullMp3, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': fullMp3.length.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
