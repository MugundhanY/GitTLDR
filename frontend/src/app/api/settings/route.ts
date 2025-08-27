import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/settings - Get user settings
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's repositories
    const repositories = await prisma.repository.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })

    // Get user's repositories count
    const repositoryCount = await prisma.repository.count({
      where: { userId: user.id }
    })

    // Get user's transaction history for stats
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Calculate total credits used
    const totalCreditsUsed = await prisma.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'USAGE'
      },
      _sum: {
        credits: true
      }
    })

    // Transform repository data
    const repositoryData = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      url: repo.url,
      isPrivate: repo.isPrivate || false,
      lastAnalyzed: repo.updatedAt.toISOString(),
      status: repo.description?.includes('[ARCHIVED]') ? 'archived' : 'active',
      webhookEnabled: false, // TODO: Implement webhook status tracking
      analysisCount: 0 // TODO: Implement analysis count tracking
    }))

    const settings = {
      profile: {
        name: user.name || 'User',
        email: user.email,
        avatar: user.avatarUrl || '',
        bio: user.bio || '',
        location: user.location || '',
        company: user.company || '',
        website: user.blog || '',
        twitterUsername: user.twitterUsername || ''
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: false,
        analysisComplete: true,
        weeklyReports: true,
        securityAlerts: true
      },
      privacy: {
        publicProfile: false,
        shareAnalytics: true,
        allowIndexing: false
      },
      preferences: {
        theme: 'system' as const,
        language: 'en',
        timezone: 'UTC',
        defaultAnalysisDepth: 'standard' as const
      },
      repositories: repositoryData,
      stats: {
        totalRepositories: repositoryCount,
        activeRepositories: repositoryData.filter(r => r.status === 'active').length,
        archivedRepositories: repositoryData.filter(r => r.status === 'archived').length,
        totalAnalyses: repositoryData.reduce((sum, r) => sum + r.analysisCount, 0)
      }
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const authUser = await getUserFromRequest(request)
    const body = await request.json()
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get full user data from database
    const user = await prisma.user.findUnique({ where: { id: authUser.id } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user profile fields that exist in the database
    const updateData: any = {}
    
    if (body.profile) {
      if (body.profile.name) updateData.name = body.profile.name
      if (body.profile.bio !== undefined) updateData.bio = body.profile.bio
      if (body.profile.location !== undefined) updateData.location = body.profile.location
      if (body.profile.company !== undefined) updateData.company = body.profile.company
      if (body.profile.website !== undefined) updateData.blog = body.profile.website
      if (body.profile.twitterUsername !== undefined) updateData.twitterUsername = body.profile.twitterUsername
      // Note: email, githubId, githubLogin should not be changed via settings
      // as they're linked to GitHub OAuth
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    })

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
