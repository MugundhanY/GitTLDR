import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/billing/download-history - Download billing history as CSV
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get full user data from database
    const user = await prisma.user.findUnique({ where: { id: authUser.id } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch all transactions for the user
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Generate CSV content
    const csvHeaders = 'Date,Type,Description,Credits,Amount,Status,Transaction ID\n'
    
    const csvRows = transactions.map(transaction => {
      const date = transaction.createdAt.toISOString().split('T')[0]
      const type = transaction.type.toLowerCase()
      const description = `"${transaction.description.replace(/"/g, '""')}"` // Escape quotes
      const credits = transaction.credits
      const amount = transaction.amount || 0
      const status = 'completed' // All saved transactions are completed
      const transactionId = transaction.id
      
      return `${date},${type},${description},${credits},${amount},${status},${transactionId}`
    }).join('\n')

    const csvContent = csvHeaders + csvRows

    // Set headers for CSV download
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv')
    headers.set('Content-Disposition', `attachment; filename="billing-history-${new Date().toISOString().split('T')[0]}.csv"`)

    return new NextResponse(csvContent, { headers })

  } catch (error) {
    console.error('Error generating billing history:', error)
    return NextResponse.json(
      { error: 'Failed to generate billing history' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
