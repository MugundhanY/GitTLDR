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
      const fileBuffer = await b2Storage.downloadFileBuffer(filePath)
      
      if (!fileBuffer) {
        console.warn(`No content returned for file: ${filePath}`)
        return NextResponse.json(
          { error: 'File not found or empty' },
          { status: 404 }
        )
      }

      console.log(`Successfully downloaded file: ${filePath} (${fileBuffer.byteLength} bytes)`)
      
      // For PDFs and binary files, return as base64 encoded string
      // This preserves the binary data while allowing it to be transmitted as text
      // FIXED: Use Buffer for proper base64 encoding (handles large files correctly)
      const base64Content = Buffer.from(fileBuffer).toString('base64')
      
      console.log(`Converted to base64: ${base64Content.length} characters`)
      
      // Return the file content as base64 encoded text
      return new NextResponse(base64Content, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type': 'base64',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
      
    } catch (downloadError) {
      console.error(`B2 download error for ${filePath}:`, downloadError)
      
      // Try fallback: direct B2 URL access
      try {
        const bucketName = process.env.B2_BUCKET_NAME || 'gittldr-attachments'
        const directUrl = `https://f002.backblazeb2.com/file/${bucketName}/${filePath}`
        
        console.log(`Trying direct B2 URL fallback for ${filePath}: ${directUrl}`)
        
        const response = await fetch(directUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          
          // Convert to base64
          const uint8Array = new Uint8Array(arrayBuffer)
          const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('')
          const base64Content = btoa(binaryString)
          
          console.log(`Direct URL fallback successful for ${filePath}, base64 length: ${base64Content.length}`)
          
          return new NextResponse(base64Content, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Content-Type': 'base64',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          })
        } else {
          console.error(`Direct URL fallback failed for ${filePath}:`, response.status, response.statusText)
        }
      } catch (fallbackError) {
        console.error(`Direct URL fallback error for ${filePath}:`, fallbackError)
      }
      
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
