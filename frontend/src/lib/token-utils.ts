import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development';

export interface TokenPayload {
  attachmentId: string;
  fileName: string;
  userId?: string;
  exp?: number;
}

export function generateSecureToken(payload: Omit<TokenPayload, 'exp'>): string {
  const tokenPayload: TokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiration
  };
  
  return jwt.sign(tokenPayload, JWT_SECRET);
}

export function verifySecureToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    if (!decoded?.exp) return true;
    
    return decoded.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}
