import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Generate RTF content (Rich Text Format - compatible with Word)
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}
\\f0\\fs24 
{\\b\\fs32 MEETING REPORT}\\par\\par

{\\b Title:} ${meeting.title || 'Untitled Meeting'}\\par
{\\b Date:} ${new Date(meeting.created_at).toLocaleDateString()}\\par
{\\b Status:} ${meeting.status}\\par
{\\b Organizer:} ${meeting.user?.name || 'Unknown'}\\par
${meeting.meeting_length ? `{\\b Duration:} ${formatTime(meeting.meeting_length)}\\par` : ''}
${meeting.language ? `{\\b Language:} ${meeting.language}\\par` : ''}
\\par

{\\b\\fs28 SUMMARY}\\par
${meeting.summary ? meeting.summary.replace(/\n/g, '\\par ') : 'No summary available'}\\par\\par

${meeting.full_transcript ? `
{\\b\\fs28 FULL TRANSCRIPT}\\par
${meeting.full_transcript.replace(/\n/g, '\\par ')}\\par\\par
` : ''}

${meeting.meeting_segments.length > 0 ? `
{\\b\\fs28 MEETING SEGMENTS}\\par
${meeting.meeting_segments.map((segment: any, index: number) => `
{\\b ${index + 1}. ${segment.title}}\\par
{\\i Time: ${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}}\\par
{\\b Summary:} ${segment.summary.replace(/\n/g, '\\par ')}\\par
${segment.excerpt ? `{\\i "${segment.excerpt}"}\\par` : ''}
${segment.segment_text ? `\\par Transcript: ${segment.segment_text.replace(/\n/g, '\\par ')}\\par` : ''}
\\par
`).join('')}
` : ''}

${includeComments ? `
{\\b\\fs28 COMMENTS}\\par
Comments functionality coming soon...\\par\\par
` : ''}

${includeActionItems ? `
{\\b\\fs28 ACTION ITEMS}\\par
Action items functionality coming soon...\\par\\par
` : ''}

{\\i Generated on ${new Date().toLocaleString()}}\\par
}`;

    return new NextResponse(rtfContent, {
      headers: {
        'Content-Type': 'application/rtf',
        'Content-Disposition': `attachment; filename="${meeting.title || 'meeting'}.rtf"`,
        'Content-Length': Buffer.byteLength(rtfContent).toString(),
      },
    });

  } catch (error) {
    console.error('Word export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Word export' },
      { status: 500 }
    );
  }
}
