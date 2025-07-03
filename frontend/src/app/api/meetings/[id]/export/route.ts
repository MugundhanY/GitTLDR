import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
    // Get meeting data from database with segments
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        meeting_segments: {
          orderBy: { segment_index: 'asc' }
        },
        comments: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    // Format meeting data
    const meetingData = {
      id: meeting.id,
      title: meeting.title,
      summary: meeting.user_edited_summary || meeting.summary,
      status: meeting.status,
      createdAt: meeting.created_at,
      updatedAt: meeting.updated_at,
      language: meeting.language,
      source: meeting.source,
      duration: meeting.meeting_length || null,
      participants: meeting.participants || [],
      segments: meeting.meeting_segments.map(segment => ({
        id: segment.id,
        title: segment.title,
        summary: segment.summary,
        excerpt: segment.excerpt,
        text: segment.segment_text,
        startTime: segment.start_time,
        endTime: segment.end_time,
        index: segment.segment_index
      })),
      comments: meeting.comments.map(comment => ({
        id: comment.id,
        text: comment.text,
        timestamp: comment.timestamp,
        user: comment.user,
        createdAt: comment.createdAt
      }))
    };

    let responseContent: string;
    let contentType: string;
    let fileExtension: string;

    if (format === 'pdf') {
      // Generate HTML content for PDF conversion
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${meetingData.title || 'Meeting Export'}</title>
    <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 40px; 
          line-height: 1.6; 
          color: #333;
          background: white;
        }
        .header { 
          border-bottom: 3px solid #007acc; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .title { 
          font-size: 28px; 
          font-weight: 700; 
          margin-bottom: 15px; 
          color: #007acc;
        }
        .meta { 
          color: #666; 
          font-size: 14px; 
          margin-bottom: 8px; 
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .meta-label {
          font-weight: 600;
          min-width: 80px;
        }
        .summary { 
          background: #f8f9fa; 
          padding: 25px; 
          border-radius: 8px; 
          margin: 30px 0; 
          border-left: 4px solid #28a745;
        }
        .summary h3 {
          margin-top: 0;
          color: #28a745;
          font-size: 18px;
        }
        .segment { 
          margin: 25px 0; 
          padding: 20px; 
          border-left: 4px solid #007acc; 
          background: #f8f9fa;
          border-radius: 0 8px 8px 0;
          page-break-inside: avoid;
        }
        .segment-title { 
          font-weight: 700; 
          font-size: 16px; 
          margin-bottom: 12px; 
          color: #007acc;
        }
        .timestamp { 
          color: #666; 
          font-size: 12px; 
          font-weight: 500;
          background: #e9ecef;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 10px;
        }
        .participants { 
          margin: 25px 0; 
        }
        .participants h3 {
          color: #495057;
          margin-bottom: 15px;
        }
        .participant { 
          display: inline-block; 
          margin: 5px; 
          padding: 8px 12px; 
          background: #e3f2fd; 
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          color: #1976d2;
        }
        .comments { 
          margin: 30px 0; 
        }
        .comments h3 {
          color: #495057;
          margin-bottom: 15px;
        }
        .comment { 
          margin: 15px 0; 
          padding: 15px; 
          background: #fff3cd; 
          border-left: 4px solid #ffc107;
          border-radius: 0 8px 8px 0;
        }
        .comment-header {
          font-weight: 600;
          color: #856404;
          margin-bottom: 8px;
        }
        .segments-header {
          color: #495057;
          margin: 30px 0 20px 0;
          font-size: 20px;
          font-weight: 600;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #dee2e6;
          text-align: center;
          color: #6c757d;
          font-size: 12px;
        }
        @page {
          margin: 20mm;
          size: A4;
        }
        @media print {
          body { margin: 0; padding: 20px; }
          .header { page-break-after: avoid; }
          .segment { page-break-inside: avoid; }
          .summary { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${meetingData.title || 'Meeting Export'}</div>
        <div class="meta">
            <span class="meta-label">Date:</span>
            <span>${new Date(meetingData.createdAt).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
        </div>
        <div class="meta">
            <span class="meta-label">Duration:</span>
            <span>${meetingData.duration ? Math.floor(meetingData.duration / 60) + ' minutes' : 'N/A'}</span>
        </div>
        <div class="meta">
            <span class="meta-label">Status:</span>
            <span style="text-transform: capitalize;">${meetingData.status}</span>
        </div>
        <div class="meta">
            <span class="meta-label">Language:</span>
            <span>${meetingData.language || 'N/A'}</span>
        </div>
    </div>
    
    ${meetingData.participants && meetingData.participants.length > 0 ? `
    <div class="participants">
        <h3>Participants (${meetingData.participants.length})</h3>
        ${meetingData.participants.map((participant: any) => `
            <span class="participant">${participant.name || participant}</span>
        `).join('')}
    </div>
    ` : ''}
    
    <div class="summary">
        <h3>Meeting Summary</h3>
        <p>${meetingData.summary || 'No summary available for this meeting.'}</p>
    </div>
    
    <h2 class="segments-header">Meeting Segments (${meetingData.segments.length} total)</h2>
    ${meetingData.segments.length > 0 ? meetingData.segments.map((segment: any) => `
        <div class="segment">
            <div class="segment-title">${segment.index + 1}. ${segment.title}</div>
            <div class="timestamp">⏱️ ${Math.floor(segment.startTime / 60)}:${String(Math.floor(segment.startTime % 60)).padStart(2, '0')} - ${Math.floor(segment.endTime / 60)}:${String(Math.floor(segment.endTime % 60)).padStart(2, '0')}</div>
            <p><strong>Summary:</strong> ${segment.summary}</p>
            ${segment.text ? `<p><strong>Transcript:</strong> ${segment.text.length > 800 ? segment.text.substring(0, 800) + '...' : segment.text}</p>` : ''}
        </div>
    `).join('') : '<p style="text-align: center; color: #6c757d; font-style: italic; padding: 40px;">No segments available for this meeting.</p>'}
    
    ${meetingData.comments && meetingData.comments.length > 0 ? `
    <div class="comments">
        <h3>Comments & Notes (${meetingData.comments.length} total)</h3>
        ${meetingData.comments.map((comment: any) => `
            <div class="comment">
                <div class="comment-header">
                    💬 ${comment.user?.name || 'Anonymous'} - ${new Date(comment.createdAt).toLocaleDateString()}
                    ${comment.timestamp ? ` at ${Math.floor(comment.timestamp / 60)}:${String(Math.floor(comment.timestamp % 60)).padStart(2, '0')}` : ''}
                </div>
                <p>${comment.text}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
        <p>📄 Generated by GitTLDR Meeting System on ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
    </div>
</body>
</html>`;

      // Generate PDF using Puppeteer
      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '15mm',
            bottom: '20mm',
            left: '15mm'
          }
        });
        
        await browser.close();
        
        return new NextResponse(Buffer.from(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="meeting-${meetingId}.pdf"`
          }
        });
        
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        // Fallback to HTML
        contentType = 'text/html';
        fileExtension = 'html';
        responseContent = htmlContent;
      }
    } else if (format === 'docx') {
      // Generate RTF (Rich Text Format) which is readable by Word
      const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 ${meetingData.title || 'Meeting Export'}\\par
\\par
Date: ${new Date(meetingData.createdAt).toLocaleDateString()}\\par
Duration: ${meetingData.duration || 'N/A'}\\par
Status: ${meetingData.status}\\par
Language: ${meetingData.language || 'N/A'}\\par
\\par
${meetingData.participants && meetingData.participants.length > 0 ? `
\\b Participants\\b0\\par
${meetingData.participants.map((participant: any) => `${participant.name || participant}\\par`).join('')}
\\par
` : ''}
\\b Summary\\b0\\par
${meetingData.summary || 'No summary available'}\\par
\\par
\\b Meeting Segments\\b0\\par
${meetingData.segments.map((segment: any, index: number) => `
\\par
${index + 1}. \\b ${segment.title}\\b0\\par
Time: ${Math.floor(segment.startTime / 60)}:${String(segment.startTime % 60).padStart(2, '0')} - ${Math.floor(segment.endTime / 60)}:${String(segment.endTime % 60).padStart(2, '0')}\\par
Summary: ${segment.summary}\\par
${segment.text ? `Transcript: ${segment.text}\\par` : ''}
`).join('')}
${meetingData.comments && meetingData.comments.length > 0 ? `
\\par
\\b Comments & Notes\\b0\\par
${meetingData.comments.map((comment: any) => `
\\b ${comment.user?.name || 'Anonymous'}\\b0 - ${new Date(comment.createdAt).toLocaleDateString()}\\par
${comment.text}\\par\\par
`).join('')}
` : ''}
\\par
\\line
Generated by GitTLDR Meeting System on ${new Date().toLocaleDateString()}
}`;
      contentType = 'application/rtf';
      fileExtension = 'rtf';
      responseContent = rtfContent;
    } else if (format === 'json') {
      return NextResponse.json(meetingData);
    } else {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      );
    }

    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="meeting-${meetingId}.${fileExtension}"`
    };

    return new NextResponse(responseContent, { headers });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export meeting' },
      { status: 500 }
    );
  }
}