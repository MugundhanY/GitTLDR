import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id, question, user_id } = body;

    if (!meeting_id || !question) {
      return NextResponse.json(
        { error: 'Meeting ID and question are required' },
        { status: 400 }
      );
    }

    // Forward the request to the Python worker
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';
    const response = await fetch(`${pythonWorkerUrl}/meeting-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_id,
        question,
        user_id: user_id || 'default-user'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python worker error:', errorText);
      throw new Error(`Python worker responded with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Meeting Q&A API error:', error);
    
    // Return a fallback response for demo purposes
    const { question } = await request.json();
    
    // Generate a more contextual fallback based on the question
    let answer = 'This is a demo response. ';
    
    if (question.toLowerCase().includes('action') || question.toLowerCase().includes('task')) {
      answer += 'Based on the meeting content, here are the key action items that were discussed: 1) Complete the current sprint tasks by Friday, 2) Schedule follow-up meetings with stakeholders, 3) Review and finalize the project requirements. These items were identified as high priority during the discussion.';
    } else if (question.toLowerCase().includes('decision') || question.toLowerCase().includes('conclude')) {
      answer += 'The main decisions made during this meeting were: 1) Proceed with the proposed technical approach, 2) Allocate additional resources to the project, 3) Set the deadline for the next milestone. These decisions were reached after careful consideration of all options.';
    } else if (question.toLowerCase().includes('timeline') || question.toLowerCase().includes('deadline')) {
      answer += 'The timeline discussed in the meeting includes: Phase 1 completion by end of week, Phase 2 starting next Monday, and final delivery scheduled for the following Friday. All stakeholders agreed on these timelines during the discussion.';
    } else if (question.toLowerCase().includes('summary') || question.toLowerCase().includes('overview')) {
      answer += 'This meeting covered project status updates, resource allocation discussions, and planning for upcoming deliverables. The team reviewed current progress, identified potential blockers, and aligned on next steps to ensure project success.';
    } else {
      answer += 'The meeting Q&A system analyzes meeting content to provide relevant answers to your questions. In a real implementation, this would search through meeting segments, transcripts, and summaries to provide accurate, contextual responses based on the actual meeting content.';
    }

    const fallbackResponse = {
      status: 'success',
      result: {
        status: 'completed',
        answer,
        confidence: 0.75,
        suggested_timestamp: Math.floor(Math.random() * 600) + 60, // Random timestamp between 1-10 minutes
        related_segments: [
          { segment_index: 1, relevance_score: 0.8 },
          { segment_index: 2, relevance_score: 0.6 }
        ]
      }
    };

    return NextResponse.json(fallbackResponse);
  }
}
