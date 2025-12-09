import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PYTHON_WORKER_URL = process.env.PYTHON_WORKER_URL || 'http://localhost:8001';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req, true);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueFixId, repositoryId } = await req.json();

    // Verify access
    const issueFix = await prisma.issueFix.findUnique({
      where: { id: issueFixId },
      include: { repository: true }
    });

    if (!issueFix || issueFix.userId !== user.id) {
      return NextResponse.json({ error: 'Issue fix not found or unauthorized' }, { status: 404 });
    }

    console.log(`Calling Python worker at ${PYTHON_WORKER_URL}/download-test-package`);
    console.log(`Issue Fix ID: ${issueFixId}, Repository ID: ${repositoryId}`);

    // Call Python worker to generate test package with proper structure
    const pythonResponse = await fetch(`${PYTHON_WORKER_URL}/download-test-package`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        issue_fix_id: issueFixId,
        repository_id: repositoryId
      })
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python worker error:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { detail: errorText || 'Unknown error' };
      }
      
      return NextResponse.json(
        { error: error.detail || 'Failed to generate test package from Python worker' },
        { status: pythonResponse.status }
      );
    }

    // Stream the ZIP file from Python worker
    const zipBuffer = await pythonResponse.arrayBuffer();
    const repository = issueFix.repository;
    const filename = `${repository.name}-fix-${issueFix.issueNumber}.zip`;

    console.log(`Successfully generated test package: ${filename}, size: ${zipBuffer.byteLength} bytes`);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBuffer.byteLength.toString()
      }
    });

  } catch (error) {
    console.error('Error generating test package:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
