import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { answerId, stepId, type, value, userId } = await req.json()
  // Debug log to verify API is hit and data is correct
  console.log('FEEDBACK POST', { answerId, stepId, type, value, userId })
  // type: 'qna' | 'deep' | 'step', value: 'like' | 'dislike'
  // Upsert feedback: update if exists, else create
  const feedback = await prisma.feedback.upsert({
    where: {
      answerId_userId_type: {
        answerId: answerId || undefined,
        userId: userId || undefined,
        type,
      },
    },
    update: { value },
    create: {
      answerId,
      stepId,
      type,
      value,
      userId,
    },
  })
  // Debug log to verify DB write
  console.log('FEEDBACK UPSERT RESULT', feedback)
  return NextResponse.json({ success: true, feedback })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const answerId = searchParams.get('answerId')
  const userId = searchParams.get('userId')
  const type = searchParams.get('type')
  if (!answerId || !userId || !type) {
    return NextResponse.json({ feedback: null })
  }
  const feedback = await prisma.feedback.findUnique({
    where: {
      answerId_userId_type: {
        answerId,
        userId,
        type,
      },
    },
  })
  return NextResponse.json({ feedback })
}
