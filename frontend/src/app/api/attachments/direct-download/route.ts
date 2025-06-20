import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { filePath, userId } = await request.json();

    if (!filePath || !userId) {
      return NextResponse.json(
        { error: 'Missing filePath or userId' },
        { status: 400 }
      );
    }

    console.log(`Direct B2 download request for: ${filePath}`);    // Import B2 storage service
    const { B2StorageService } = await import('@/lib/b2-storage');
    
    // Create B2 storage instance
    const b2Storage = new B2StorageService();
    
    // Download file content from B2
    const fileContent = await b2Storage.downloadFileContent(filePath);
    
    if (!fileContent) {
      return NextResponse.json(
        { error: 'File not found or empty' },
        { status: 404 }
      );
    }

    console.log(`✅ Successfully downloaded ${filePath}: ${fileContent.length} characters`);

    // Return the file content directly
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': fileContent.length.toString()
      }
    });

  } catch (error) {
    console.error('Error in direct B2 download:', error);
    return NextResponse.json(
      { error: 'Failed to download file from B2' },
      { status: 500 }
    );
  }
}
