import { NextRequest, NextResponse } from 'next/server'
import { B2StorageService } from '@/lib/b2-storage'

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }

    console.log(`Direct download request for: ${filePath}`)
    
    // Initialize B2 storage service
    const b2Storage = new B2StorageService()
    
    try {
      // Download file content directly from B2
      const content = await b2Storage.downloadFileContent(filePath)
      
      if (!content) {
        console.warn(`No content returned for file: ${filePath}`)
        return NextResponse.json(
          { error: 'File not found or empty' },
          { status: 404 }
        )
      }

      console.log(`Successfully downloaded file: ${filePath} (${content.length} characters)`)
      
      // Return the file content as text
      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
      
    } catch (downloadError) {
      console.error(`B2 download error for ${filePath}:`, downloadError)
      return NextResponse.json(
        { error: 'Failed to download file from storage', details: String(downloadError) },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Direct download endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
