import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/billing - Get user billing data with real database queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'
    
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

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default: // 30d
        startDate.setDate(now.getDate() - 30)
    }

    // Fetch transactions from database
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: startDate
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Also fetch all-time transactions for totals
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate totals from all transactions
    const totalPurchased = allTransactions
      .filter(t => t.type === 'PURCHASE')
      .reduce((sum, t) => sum + t.credits, 0)
    
    const totalUsed = Math.abs(allTransactions
      .filter(t => t.type === 'USAGE')
      .reduce((sum, t) => sum + t.credits, 0))
    
    const totalSpent = allTransactions
      .filter(t => t.type === 'PURCHASE' && t.amount)
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // Use the current credits from the User model as the authoritative source
    const currentCredits = user.credits

    // Calculate monthly usage (current month)
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyUsage = Math.abs(allTransactions
      .filter(t => t.type === 'USAGE' && t.createdAt >= currentMonth)
      .reduce((sum, t) => sum + t.credits, 0))

    // Generate chart data based on time range
    const generateChartData = () => {
      const chartTransactions = transactions.filter(t => t.createdAt >= startDate)
      let labels: string[] = []
      let purchased: number[] = []
      let used: number[] = []
      let amounts: number[] = []

      switch (timeRange) {
        case '7d':
          labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          // Group by day of week
          for (let i = 0; i < 7; i++) {
            const dayStart = new Date(startDate)
            dayStart.setDate(startDate.getDate() + i)
            const dayEnd = new Date(dayStart)
            dayEnd.setDate(dayStart.getDate() + 1)
            
            const dayTransactions = chartTransactions.filter(t => 
              t.createdAt >= dayStart && t.createdAt < dayEnd
            )
            
            purchased.push(dayTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + t.credits, 0))
            
            used.push(Math.abs(dayTransactions
              .filter(t => t.type === 'USAGE')
              .reduce((sum, t) => sum + t.credits, 0)))
            
            amounts.push(dayTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + (t.amount || 0), 0))
          }
          break
        default: // 30d, 90d, 1y - group by weeks/months
          const intervals = timeRange === '1y' ? 12 : (timeRange === '90d' ? 12 : 4)
          const intervalDays = timeRange === '1y' ? 30 : (timeRange === '90d' ? 7 : 7)
          
          for (let i = 0; i < intervals; i++) {
            const intervalStart = new Date(startDate)
            intervalStart.setDate(startDate.getDate() + (i * intervalDays))
            const intervalEnd = new Date(intervalStart)
            intervalEnd.setDate(intervalStart.getDate() + intervalDays)
            
            if (timeRange === '1y') {
              labels.push(intervalStart.toLocaleDateString('en-US', { month: 'short' }))
            } else {
              labels.push(`Week ${i + 1}`)
            }
            
            const intervalTransactions = chartTransactions.filter(t => 
              t.createdAt >= intervalStart && t.createdAt < intervalEnd
            )
            
            purchased.push(intervalTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + t.credits, 0))
            
            used.push(Math.abs(intervalTransactions
              .filter(t => t.type === 'USAGE')
              .reduce((sum, t) => sum + t.credits, 0)))
            
            amounts.push(intervalTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + (t.amount || 0), 0))
          }
      }

      return { labels, purchased, used, amounts }
    }

    const chartData = generateChartData()

    // Format transactions for frontend
    const formattedTransactions = transactions.slice(0, 10).map(t => ({
      id: t.id,
      type: t.type.toLowerCase(),
      amount: t.amount || 0,
      credits: t.credits,
      description: t.description,
      date: t.createdAt.toISOString(),
      status: 'completed' // All saved transactions are completed
    }))

    const billingData = {
      currentCredits: currentCredits, // Use credits from User model
      totalPurchased,
      totalUsed,
      monthlyUsage,
      totalSpent,
      creditsChart: {
        labels: chartData.labels,
        purchased: chartData.purchased,
        used: chartData.used
      },
      spendingChart: {
        labels: chartData.labels,
        amounts: chartData.amounts
      },
      transactions: formattedTransactions
    }

    return NextResponse.json(billingData)
  } catch (error) {
    console.error('Error fetching billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}