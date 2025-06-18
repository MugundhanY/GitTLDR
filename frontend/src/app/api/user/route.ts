import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/user - Get current user data
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/user - Starting user data fetch');
    
    // Get authenticated user with minimal data first (from token cache)
    const tokenUser = await getUserFromRequest(request, false);
    
    if (!tokenUser) {
      console.log('❌ No token user found - unauthorized');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ Token user found:', { 
      id: tokenUser.id, 
      email: tokenUser.email, 
      githubLogin: tokenUser.githubLogin,
      credits: tokenUser.credits 
    });

    // Try to get full user data (this will use cache if available)
    const fullUser = await getUserFromRequest(request, true);
    
    if (fullUser) {
      console.log('✅ Full user data retrieved:', { 
        id: fullUser.id, 
        name: fullUser.name, 
        email: fullUser.email,
        avatarUrl: fullUser.avatarUrl ? 'present' : 'missing',
        credits: fullUser.credits
      });
      return NextResponse.json({ user: fullUser }, {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
          'ETag': `"${fullUser.id}-${fullUser.updatedAt.getTime()}"`
        }
      });
    }

    // If full user not found in cache, try direct DB lookup
    console.log('🔍 Full user not found in cache, attempting direct DB lookup for ID:', tokenUser.id);
    const directDbUser = await prisma.user.findUnique({
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

    if (directDbUser) {
      console.log('✅ Found user in direct DB lookup:', {
        id: directDbUser.id,
        name: directDbUser.name,
        avatarUrl: directDbUser.avatarUrl ? 'present' : 'missing',
        credits: directDbUser.credits
      });
      return NextResponse.json({ user: directDbUser }, {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
          'ETag': `"${directDbUser.id}-${directDbUser.updatedAt.getTime()}"`
        }
      });
    }

    // Last resort - create minimal response from token
    console.log('⚠️ No user found in DB, using token data as fallback');
    return NextResponse.json({ 
      user: {
        id: tokenUser.id,
        name: tokenUser.username || tokenUser.githubLogin || 'User',
        email: tokenUser.email || '',
        avatarUrl: null,
        githubLogin: tokenUser.githubLogin,
        credits: tokenUser.credits || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'ETag': `"${tokenUser.id}-${Date.now()}"`
      }
    });

  } catch (error) {
    console.error('💥 Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

// PUT /api/user - Update user data
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email } = body;

    // Update user data in database
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        ...(name && { name }),
        ...(email && { email })
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        credits: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error('Error updating user data:', error);
    return NextResponse.json(
      { error: 'Failed to update user data' },
      { status: 500 }
    );
  }
}
