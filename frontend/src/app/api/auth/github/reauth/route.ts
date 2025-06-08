import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope') || 'user:email';
  
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/github/callback`;
  
  if (!clientId) {
    return NextResponse.json({ error: 'GitHub client ID not configured' }, { status: 500 });
  }

  // Redirect to GitHub OAuth with requested scope
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=reauth`;

  return NextResponse.redirect(githubUrl);
}
