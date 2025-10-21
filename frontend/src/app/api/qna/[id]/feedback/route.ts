import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, QuestionFeedback } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { feedback } = await request.json()
    const questionId = params.id

    // Validate feedback
    if (feedback !== null && feedback !== 'LIKE' && feedback !== 'DISLIKE') {
      return NextResponse.json(
        { error: 'Invalid feedback value' },
        { status: 400 }
      )
    }

    // Update the question's feedback
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        feedback: feedback as QuestionFeedback | null,
        feedbackAt: feedback ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    })
  } catch (error) {
    console.error('Error updating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}
