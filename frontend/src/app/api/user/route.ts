import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/user - Get current user data
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }    // Fetch user data from database
    const userData = await prisma.user.findUnique({
      where: {
        id: user.id
      },
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

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user: userData });

  } catch (error) {
    console.error('Error fetching user data:', error);
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
