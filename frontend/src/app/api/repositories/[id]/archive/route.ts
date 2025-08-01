import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: repositoryId } = await params

    // Find the repository and verify ownership
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        userId: authUser.id
      }
    })

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Mark repository as failed to effectively "archive" it
    const updatedRepository = await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        embeddingStatus: 'FAILED',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Repository archived successfully',
      repository: updatedRepository
    })

  } catch (error) {
    console.error('Error archiving repository:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
