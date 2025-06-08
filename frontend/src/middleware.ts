import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Add paths that should be public (accessible without authentication)
const publicPaths = [
  '/',
  '/auth',
  '/auth/signin',
  '/auth/signup', 
  '/auth/login',
  '/auth/callback',
  '/api/auth/github',
  '/api/auth/github/callback',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/.well-known'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Always log middleware execution
  console.log('🚨 MIDDLEWARE RUNNING FOR:', pathname);
  console.log('🚨 Request URL:', request.url);
  console.log('🚨 All cookies:', request.cookies.toString());
  
  // Skip middleware for Chrome dev tools and other browser-specific requests
  if (pathname.startsWith('/.well-known/') || pathname.startsWith('/favicon.ico')) {
    console.log('🚨 SKIPPING - dev tools/favicon');
    return NextResponse.next();
  }
  // Check if the path is public - allow these without authentication
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isRootPath = pathname === '/';
  
  console.log('🔧 Is public path?', isPublicPath, 'Is root path?', isRootPath);
  console.log('🔧 Public paths:', publicPaths);
  
  if (isPublicPath || isRootPath) {
    console.log('✅ PUBLIC PATH, allowing access:', pathname);
    return NextResponse.next();
  }

  // For all other paths (including protected ones), require authentication
  console.log('🔒 PROTECTED PATH, checking auth:', pathname);
  
  const token = request.cookies.get('auth_token')?.value;
  console.log('🔑 Token found:', !!token);
  console.log('🔑 Token value:', token ? token.substring(0, 20) + '...' : 'MISSING');

  if (!token) {
    // Redirect to auth page if no token exists
    console.log('❌ NO TOKEN, redirecting to auth');
    console.log(`❌ Redirecting unauthenticated user from ${pathname} to /auth`);
    const redirectUrl = new URL('/auth', request.url);
    console.log('❌ Redirect URL:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Verify the token
    console.log('🔍 Verifying token...');
    const decoded = await verifyToken(token);
    console.log('✅ TOKEN VALID for user:', decoded.id);
    
    // If token is valid, continue
    if (decoded) {
      return NextResponse.next();
    } else {
      // Token is invalid, redirect to auth
      console.log('❌ TOKEN DECODED BUT FALSY, redirecting to auth');
      console.log(`Invalid token for ${pathname}, redirecting to /auth`);
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  } catch (error) {
    // If token verification fails, redirect to auth
    console.log('❌ TOKEN VERIFICATION FAILED, redirecting to auth:', error);
    console.log(`Token verification failed for ${pathname}:`, error);
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    // Match all protected routes explicitly
    '/dashboard/:path*',
    '/repositories/:path*', 
    '/billing/:path*',
    '/settings/:path*',
    '/files/:path*',
    '/meetings/:path*',
    '/team/:path*',
    '/qna/:path*',
    // Also include API routes that need protection
    '/api/user/:path*',
    '/api/repositories/:path*',
    '/api/billing/:path*',
    '/api/meetings/:path*',
    '/api/qna/:path*',
    // Catch-all for any other routes not explicitly public
    '/((?!_next/static|_next/image|favicon.ico|auth|api/auth).*)',
  ],
};