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
  
  // Reduce console logging in production for better performance
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('🚨 MIDDLEWARE RUNNING FOR:', pathname);
  }
  
  // Skip middleware for static files and dev tools
  if (pathname.startsWith('/.well-known/') || 
      pathname.startsWith('/favicon.ico') || 
      pathname.startsWith('/_next/static') ||
      pathname.startsWith('/_next/image')) {
    return NextResponse.next();
  }
  
  // Check if the path is public - allow these without authentication
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isRootPath = pathname === '/';
  
  if (isPublicPath || isRootPath) {
    if (isDevelopment) {
      console.log('✅ PUBLIC PATH, allowing access:', pathname);
    }
    return NextResponse.next();
  }

  // For all other paths (including protected ones), require authentication
  if (isDevelopment) {
    console.log('🔒 PROTECTED PATH, checking auth:', pathname);
  }
  
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    if (isDevelopment) {
      console.log('❌ NO TOKEN, redirecting to auth');
    }
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  try {    
    // Quick token verification without database lookup
    const decoded = await verifyToken(token);
    
    if (isDevelopment) {
      console.log('[AUTH] TOKEN VALID for user:', decoded.id);
    }
    
    // Add user info to request headers for downstream use
    const response = NextResponse.next();
    response.headers.set('x-user-id', decoded.id);
    response.headers.set('x-user-email', decoded.email || '');
    
    return response;
  } catch (error) {
    if (isDevelopment) {
      console.log('❌ TOKEN VERIFICATION FAILED:', error);
    }
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