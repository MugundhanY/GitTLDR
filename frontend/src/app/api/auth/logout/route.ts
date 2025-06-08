import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Clear the auth cookie
    await clearAuthCookie();
    
    // Return successful response
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error logging out' 
      },
      { status: 500 }
    );
  }
}

// Add GET handler to support logout via browser link
export async function GET(request: NextRequest) {
  try {
    // Clear the auth cookie
    clearAuthCookie();
    
    // Redirect to home page after logout
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error logging out' 
      },
      { status: 500 }
    );
  }
}
