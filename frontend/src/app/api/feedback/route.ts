import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Feedback feature disabled - focusing on export options instead
  return NextResponse.json({ success: true, feedback: null })
}

export async function GET(req: NextRequest) {
  // Feedback feature disabled - focusing on export options instead
  return NextResponse.json({ feedback: null })
}
