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
      // Use all transactions for chart data, not just filtered ones
      const chartTransactions = allTransactions
      let labels: string[] = []
      let purchased: number[] = []
      let used: number[] = []
      let amounts: number[] = []

      switch (timeRange) {
        case '7d':
          labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          // Group by day of week for the last 7 days
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
        case '30d':
          // Group by weeks for the last 30 days - start from 30 days ago to today
          labels = ['Week 1 (Latest)', 'Week 2', 'Week 3', 'Week 4 (Oldest)']
          for (let i = 0; i < 4; i++) {
            // Start from most recent week (i=0) and go backwards
            const weekEnd = new Date(now)
            weekEnd.setDate(now.getDate() - (i * 7))
            const weekStart = new Date(weekEnd)
            weekStart.setDate(weekEnd.getDate() - 7)
            
            // Ensure we don't go before our startDate
            if (weekStart < startDate) {
              weekStart.setTime(startDate.getTime())
            }
            
            console.log(`30d Week ${i + 1}: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`)
            
            const weekTransactions = chartTransactions.filter(t => {
              const transactionDate = new Date(t.createdAt)
              return transactionDate >= weekStart && transactionDate <= weekEnd
            })
            
            console.log(`30d Week ${i + 1} transactions:`, weekTransactions.length, weekTransactions.map(t => ({
              id: t.id,
              date: t.createdAt,
              type: t.type,
              credits: t.credits
            })))
            
            purchased.push(weekTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + t.credits, 0))
            
            used.push(Math.abs(weekTransactions
              .filter(t => t.type === 'USAGE')
              .reduce((sum, t) => sum + t.credits, 0)))
            
            amounts.push(weekTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + (t.amount || 0), 0))
          }
          // Reverse arrays to show oldest to newest
          labels.reverse()
          purchased.reverse()
          used.reverse()
          amounts.reverse()
          break
        case '90d':
          // Group by months for the last 90 days (3 months)
          for (let i = 0; i < 3; i++) {
            const monthStart = new Date(startDate)
            monthStart.setMonth(startDate.getMonth() + i)
            const monthEnd = new Date(monthStart)
            monthEnd.setMonth(monthStart.getMonth() + 1)
            
            labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }))
            
            const monthTransactions = chartTransactions.filter(t => 
              t.createdAt >= monthStart && t.createdAt < monthEnd
            )
            
            purchased.push(monthTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + t.credits, 0))
            
            used.push(Math.abs(monthTransactions
              .filter(t => t.type === 'USAGE')
              .reduce((sum, t) => sum + t.credits, 0)))
            
            amounts.push(monthTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + (t.amount || 0), 0))
          }
          break
        case '1y':
          // Group by months for the last year
          for (let i = 0; i < 12; i++) {
            const monthStart = new Date(startDate)
            monthStart.setMonth(startDate.getMonth() + i)
            const monthEnd = new Date(monthStart)
            monthEnd.setMonth(monthStart.getMonth() + 1)
            
            labels.push(monthStart.toLocaleDateString('en-US', { month: 'short' }))
            
            const monthTransactions = chartTransactions.filter(t => 
              t.createdAt >= monthStart && t.createdAt < monthEnd
            )
            
            purchased.push(monthTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + t.credits, 0))
            
            used.push(Math.abs(monthTransactions
              .filter(t => t.type === 'USAGE')
              .reduce((sum, t) => sum + t.credits, 0)))
            
            amounts.push(monthTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + (t.amount || 0), 0))
          }
          break
        default:
          // Fallback: show summary data across all time ranges
          const timeRanges = ['This Week', 'Last Week', 'This Month', 'Last Month']
          labels = timeRanges
          
          // Calculate for each time period
          const thisWeekStart = new Date(now)
          thisWeekStart.setDate(now.getDate() - now.getDay())
          
          const lastWeekStart = new Date(thisWeekStart)
          lastWeekStart.setDate(thisWeekStart.getDate() - 7)
          
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const lastMonthEnd = new Date(thisMonthStart)
          lastMonthEnd.setDate(lastMonthEnd.getDate() - 1)
          
          const periods = [
            { start: thisWeekStart, end: now },
            { start: lastWeekStart, end: thisWeekStart },
            { start: thisMonthStart, end: now },
            { start: lastMonthStart, end: lastMonthEnd }
          ]
          
          periods.forEach(period => {
            const periodTransactions = chartTransactions.filter(t => 
              t.createdAt >= period.start && t.createdAt <= period.end
            )
            
            purchased.push(periodTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + t.credits, 0))
            
            used.push(Math.abs(periodTransactions
              .filter(t => t.type === 'USAGE')
              .reduce((sum, t) => sum + t.credits, 0)))
            
            amounts.push(periodTransactions
              .filter(t => t.type === 'PURCHASE')
              .reduce((sum, t) => sum + (t.amount || 0), 0))
          })
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