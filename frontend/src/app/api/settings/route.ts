import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') // You'll need to add proper auth
    
    // For demo, get the first user if no user ID provided
    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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

    const settings = {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatarUrl || '',
        bio: user.bio || '',
        location: user.location || '',
        company: user.company || '',
        website: user.blog || '',
        githubLogin: user.githubLogin || '',
        publicRepos: user.publicRepos || 0,
        followers: user.followers || 0,
        following: user.following || 0,
        githubCreatedAt: user.githubCreatedAt,
        joinedAt: user.createdAt
      },
      stats: {
        repositoryCount,
        totalCreditsUsed: Math.abs(totalCreditsUsed._sum.credits || 0),
        currentCredits: user.credits,
        recentTransactions: transactions.length
      },
      preferences: {
        theme: 'system', // You can add these fields to User model if needed
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: true,
        autoSave: true,
        compactMode: false
      },
      security: {
        twoFactorEnabled: false, // Add to User model if implementing 2FA
        sessionTimeout: 30,
        loginNotifications: true,
        deviceTracking: true,
        lastLogin: user.updatedAt
      },
      notifications: {
        email: {
          repositoryProcessing: true,
          creditUpdates: true,
          securityAlerts: true,
          weeklyDigest: false
        },
        push: {
          repositoryProcessing: true,
          creditLow: true,
          mentions: false
        }
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
    const userId = request.headers.get('x-user-id') // You'll need to add proper auth
    const body = await request.json()
    
    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user profile fields that exist in the database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.profile?.name || user.name,
        bio: body.profile?.bio || user.bio,
        location: body.profile?.location || user.location,
        company: body.profile?.company || user.company,
        blog: body.profile?.website || user.blog,
        // Note: email, githubLogin, etc. should not be changed via settings
        // as they're linked to GitHub OAuth
      }
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
