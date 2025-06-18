import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { userCache } from '@/lib/cache';

const prisma = new PrismaClient();

// POST /api/user/refresh - Force refresh user data from database
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/user/refresh - Force refreshing user data');
    
    // Get authenticated user with minimal data first (from token cache)
    const tokenUser = await getUserFromRequest(request, false);
    
    if (!tokenUser) {
      console.log('❌ No token user found - unauthorized');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Token user found, clearing cache and fetching fresh data for:', tokenUser.id);

    // Clear user cache
    const cacheKey = `user:${tokenUser.id}`;
    userCache.delete(cacheKey);

    // Fetch fresh user data from database
    const freshUser = await prisma.user.findUnique({
      where: { id: tokenUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        githubLogin: true,
        credits: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!freshUser) {
      console.log('❌ User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ Fresh user data retrieved:', {
      id: freshUser.id,
      name: freshUser.name,
      avatarUrl: freshUser.avatarUrl ? 'present' : 'missing',
      credits: freshUser.credits
    });

    // Cache the fresh data
    userCache.set(cacheKey, freshUser, 300); // 5 minutes cache

    return NextResponse.json({ 
      user: freshUser,
      refreshed: true 
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'ETag': `"${freshUser.id}-${freshUser.updatedAt.getTime()}"`
      }
    });

  } catch (error) {
    console.error('💥 Error refreshing user data:', error);
    return NextResponse.json(
      { error: 'Failed to refresh user data' },
      { status: 500 }
    );
  }
}