import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repositoryId, question, attachments = [], stream = true } = body

    if (!repositoryId || !question) {
      return NextResponse.json(
        { error: 'Repository ID and question are required' },
        { status: 400 }
      )
    }

    // Get python worker URL from environment
    const pythonWorkerUrl = process.env.PYTHON_WORKER_URL || 'http://localhost:8001'

    // Call python worker comprehensive thinking endpoint
    const response = await fetch(`${pythonWorkerUrl}/comprehensive-thinking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository_id: repositoryId,
        question,
        attachments,
        stream
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Python worker thinking error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to process thinking request', details: errorText },
        { status: response.status }
      )
    }

    // If streaming, return the stream directly
    if (stream) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // If not streaming, return JSON response
    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Thinking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
