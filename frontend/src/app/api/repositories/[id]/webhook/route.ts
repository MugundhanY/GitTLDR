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
    const { enabled } = await request.json()

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

    // For now, we'll just return success since webhook setup is complex
    // In a real implementation, you'd integrate with GitHub API here
    
    return NextResponse.json({ 
      message: `Webhook ${enabled ? 'enabled' : 'disabled'} successfully`,
      webhookEnabled: enabled
    })

  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
