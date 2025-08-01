import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

export async function DELETE(
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

    // Delete the repository and all related data
    await prisma.repository.delete({
      where: { id: repositoryId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting repository:', error)
    return NextResponse.json(
      { error: 'Failed to delete repository' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: repositoryId } = await params
    const { archived } = await request.json()

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

    // Update the repository archived status using embeddingStatus
    const updatedRepository = await prisma.repository.update({
      where: { id: repositoryId },
      data: { 
        embeddingStatus: archived ? 'FAILED' : 'COMPLETED'
      }
    })

    return NextResponse.json({ repository: updatedRepository })
  } catch (error) {
    console.error('Error updating repository:', error)
    return NextResponse.json(
      { error: 'Failed to update repository' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
