import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8000';
    
    // Test if Python worker is accessible
    const response = await fetch(`${pythonWorkerUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        status: 'success',
        message: 'Python worker is accessible',
        worker_url: pythonWorkerUrl,
        worker_response: data
      });
    } else {
      throw new Error(`Python worker responded with status ${response.status}`);
    }

  } catch (error) {
    console.error('Python worker test failed:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Python worker is not accessible',
      worker_url: process.env.PYTHON_WORKER_URL || 'http://localhost:8000',
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Ensure the Python worker is running on the specified URL'
    }, { status: 503 });
  }
}
