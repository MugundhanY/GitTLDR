import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

// POST /api/support/tickets - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { subject, category, priority, description } = body

    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      )
    }

    // For now, we'll just log the ticket since we don't have a tickets table
    // In a real app, you'd create a tickets table and save to database
    const ticket = {
      id: `ticket_${Date.now()}`,
      userId: authUser.id,
      subject,
      category,
      priority,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Log the ticket (in production, save to database or send to support system)
    console.log('Support Ticket Created:', ticket)

    // You could also send an email notification here
    // await sendEmailToSupport(ticket)

    return NextResponse.json({ 
      message: 'Support ticket created successfully',
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET /api/support/tickets - Get user's support tickets
export async function GET(request: NextRequest) {
  try {
    // Get user from session cookie
    const userIdCookie = request.cookies.get('user_id')?.value
    
    if (!userIdCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: userIdCookie } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // For now, return empty array since we don't have a tickets table
    // In a real app, you'd query the tickets table
    const tickets: any[] = []

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
