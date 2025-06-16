import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { PrismaClient, User } from '@prisma/client';
import { userCache } from './cache';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

// Type definition for the user payload in JWT
export interface JwtPayload {
  id: string;
  email?: string;
  username?: string;
  githubId?: string;
  githubLogin?: string;
  githubAccessToken?: string;
  credits?: number;
  iat: number;
  exp: number;
}

// Type for minimal user info from token
export interface MinimalUser {
  id: string;
  email?: string;
  username?: string;
  githubId?: string;
  githubLogin?: string;
  githubAccessToken?: string;
  credits?: number;
}

// Base64 URL encode function for strings
function base64UrlEncode(str: string): string {
  // Use Node.js Buffer API for server-side compatibility
  const base64 = Buffer.from(str, 'utf8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64 URL encode function for binary data (Uint8Array)
function base64UrlEncodeBinary(bytes: Uint8Array): string {
  // Use Node.js Buffer API for server-side compatibility
  const base64 = Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Base64 URL decode function
function base64UrlDecode(str: string): string {
  // Add padding if needed
  str += '='.repeat(4 - str.length % 4);
  // Convert URL-safe characters back to standard base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Use Node.js Buffer API for server-side compatibility
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Create HMAC SHA256 signature
async function createSignature(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureArray = new Uint8Array(signature);
  return base64UrlEncodeBinary(signatureArray);
}

// Verify HMAC SHA256 signature
async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = await createSignature(data, secret);
  return expectedSignature === signature;
}

/**
 * Create a JWT token for a user
 * @param user User object to encode in the token
 * @returns JWT token string
 */
export async function createToken(user: { id: string; email?: string; username?: string; githubId?: string }): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    githubId: user.githubId,
    iat: now,
    exp: now + (7 * 24 * 60 * 60) // 7 days
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await createSignature(data, JWT_SECRET);

  const token = `${data}.${signature}`;
  console.log('🔧 Created token length:', token.length);
  console.log('🔧 Token preview:', token.substring(0, 50) + '...');
  
  return token;
}

// Simple in-memory cache for verified tokens
const tokenCache = new Map<string, { payload: JwtPayload; timestamp: number }>();
const TOKEN_CACHE_TTL = 60000; // 1 minute

/**
 * Verify a JWT token with caching
 * @param token JWT token to verify
 * @returns Decoded token payload
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    // Check cache first
    const cached = tokenCache.get(token);
    if (cached && (Date.now() - cached.timestamp) < TOKEN_CACHE_TTL) {
      // Still need to check expiration from cached payload
      const now = Math.floor(Date.now() / 1000);
      if (cached.payload.exp && cached.payload.exp < now) {
        tokenCache.delete(token);
        throw new Error('Token expired');
      }
      return cached.payload;
    }

    const parts = token.split('.');
    
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    // Verify signature
    const isValid = await verifySignature(data, signature, JWT_SECRET);
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const payloadString = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadString) as JwtPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    // Cache the verified token
    tokenCache.set(token, {
      payload,
      timestamp: Date.now()
    });

    return payload;
  } catch (error) {
    // Remove from cache if verification fails
    tokenCache.delete(token);
    throw new Error('Token verification failed');
  }
}

/**
 * Set an authentication token cookie
 * @param token JWT token to set in cookie
 */
export async function setAuthCookie(token: string) {
  // Using cookies() directly with the correct cookie format
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear the authentication token cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

/**
 * Get the authenticated user from a request - overloaded for type safety
 */
export async function getUserFromRequest(req: NextRequest, includeFullData: true): Promise<User | null>;
export async function getUserFromRequest(req: NextRequest, includeFullData: false): Promise<MinimalUser | null>;
export async function getUserFromRequest(req: NextRequest, includeFullData?: boolean): Promise<User | MinimalUser | null>;
export async function getUserFromRequest(req: NextRequest, includeFullData: boolean = true): Promise<User | MinimalUser | null> {
  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyToken(token);
      if (!includeFullData) {
      // Return minimal user info from token for faster auth checks
      return {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        githubId: decoded.githubId,
        githubLogin: decoded.githubLogin,
        githubAccessToken: decoded.githubAccessToken,
        credits: decoded.credits,
      } as MinimalUser;
    }
      // Check cache first
    const cacheKey = `user:${decoded.id}`;
    const cachedUser = userCache.get(cacheKey) as User | null;
    if (cachedUser) {
      return cachedUser;
    }
    
    // Get the full user from the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    // Cache the user data for 5 minutes
    if (user) {
      userCache.set(cacheKey, user, 300);
    }

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Get basic user info from token without database query (faster)
 * @param req NextRequest object
 * @returns Basic user info or null if not authenticated
 */
export async function getUserTokenInfo(req: NextRequest) {
  return getUserFromRequest(req, false);
}

/**
 * Check if the user is authenticated
 * @param req NextRequest object
 * @returns Boolean indicating if the user is authenticated
 */
export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const user = await getUserFromRequest(req);
  return !!user;
}
