import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get GitHub OAuth credentials from environment variables
    const githubClientId = process.env.GITHUB_CLIENT_ID
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://gittldr.vercel.app'
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/github/callback`)
    
    if (!githubClientId) {
      console.error('Missing GitHub client ID in environment variables');
      return NextResponse.json(
        { error: 'GitHub OAuth configuration error' },
        { status: 500 }
      )
    }
    
    // Generate a state parameter to prevent CSRF attacks
    const state = Math.random().toString(36).substring(2, 15);
    
    // Build the GitHub authorization URL
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}&scope=user:email,repo&state=${state}`
    
    console.log('GitHub OAuth URL:', githubAuthUrl);
    
    // Return the URL as JSON instead of redirecting
    return NextResponse.json({ url: githubAuthUrl })
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate GitHub OAuth' },
      { status: 500 }
    )
  }
}
