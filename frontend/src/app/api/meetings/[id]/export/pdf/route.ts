import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();
    const { includeComments = true, includeActionItems = true } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Fetch meeting data with segments
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        user: {
          select: { name: true, email: true }
        },
        meeting_segments: {
          orderBy: { segment_index: 'asc' }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Format time helper
    const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const totalSeconds = Math.floor(seconds);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Generate text content for export
    const textContent = `
MEETING REPORT
==============

Title: ${meeting.title || 'Untitled Meeting'}
Date: ${new Date(meeting.created_at).toLocaleDateString()}
Status: ${meeting.status}
Organizer: ${meeting.user?.name || 'Unknown'}
${meeting.meeting_length ? `Duration: ${formatTime(meeting.meeting_length)}` : ''}
${meeting.language ? `Language: ${meeting.language}` : ''}

SUMMARY
-------
${meeting.summary || 'No summary available'}

${meeting.full_transcript ? `
FULL TRANSCRIPT
--------------
${meeting.full_transcript}
` : ''}

${meeting.meeting_segments.length > 0 ? `
MEETING SEGMENTS
---------------
${meeting.meeting_segments.map((segment, index) => `
${index + 1}. ${segment.title}
   Time: ${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}
   Summary: ${segment.summary}
   ${segment.excerpt ? `Excerpt: "${segment.excerpt}"` : ''}
   ${segment.segment_text ? `\n   Transcript: ${segment.segment_text}` : ''}
`).join('\n')}
` : ''}

${includeComments ? `
COMMENTS
--------
Comments functionality coming soon...
` : ''}

${includeActionItems ? `
ACTION ITEMS
-----------
Action items functionality coming soon...
` : ''}

Generated on ${new Date().toLocaleString()}
    `.trim();

    return new NextResponse(textContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${meeting.title || 'meeting'}.txt"`,
        'Content-Length': Buffer.byteLength(textContent).toString(),
      },
    });

  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF export' },
      { status: 500 }
    );
  }
}
