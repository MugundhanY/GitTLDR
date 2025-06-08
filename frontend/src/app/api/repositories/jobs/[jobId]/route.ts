import { NextRequest, NextResponse } from 'next/server';

// GET /api/repositories/jobs/[jobId] - Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Fetch job status from Node.js worker
    const workerResponse = await fetch(`${process.env.NODE_WORKER_URL}/job/${jobId}`);

    if (!workerResponse.ok) {
      if (workerResponse.status === 404) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch job status');
    }

    const jobStatus = await workerResponse.json();

    return NextResponse.json(jobStatus);

  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
