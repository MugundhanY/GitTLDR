import { NextRequest, NextResponse } from 'next/server';

// Export meeting data to different formats
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id;
    
    // Get format from query params
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    
    // For now, return a placeholder response
    // TODO: Implement actual export functionality with proper auth and database
    const mockMeeting = {
      id: meetingId,
      title: 'Sample Meeting',
      summary: 'This is a sample meeting summary',
      segments: [
        {
          id: '1',
          title: 'Opening',
          summary: 'Meeting introduction',
          startTime: 0,
          endTime: 60
        }
      ]
    };

    if (format === 'json') {
      return NextResponse.json(mockMeeting);
    }

    // For PDF/Word formats, return a simple text response for now
    const content = `
Meeting: ${mockMeeting.title}
Summary: ${mockMeeting.summary}

Segments:
${mockMeeting.segments.map((segment: any) => `
- ${segment.title}: ${segment.summary}
`).join('')}
    `;

    return new NextResponse(content, {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="meeting-${meetingId}.${format === 'pdf' ? 'pdf' : 'docx'}"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export meeting' },
      { status: 500 }
    );
  }
}
