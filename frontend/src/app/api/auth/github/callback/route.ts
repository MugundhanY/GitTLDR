import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createToken, setAuthCookie } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      console.error('No GitHub authorization code provided');
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth?error=No authorization code`);
    }
    
    // Exchange code for access token
    console.log('Exchanging GitHub code for access token');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
      const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error);
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth?error=${tokenData.error}`);
    }
    
    if (!tokenData.access_token) {
      console.error('No access token received from GitHub');
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth?error=No access token received`);
    }
    
    // Get user info from GitHub
    console.log('Fetching user info from GitHub');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user data:', await userResponse.text());
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth?error=Failed to fetch user data`);
    }    const userData = await userResponse.json();
    console.log('📊 Complete GitHub user data received:', {
      id: userData.id,
      login: userData.login,
      name: userData.name,
      email: userData.email,
      bio: userData.bio,
      location: userData.location,
      company: userData.company,
      blog: userData.blog,
      twitter_username: userData.twitter_username,
      public_repos: userData.public_repos,
      public_gists: userData.public_gists,
      followers: userData.followers,
      following: userData.following,
      avatar_url: userData.avatar_url,
      gravatar_id: userData.gravatar_id,
      hireable: userData.hireable,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    });
    
    // Get user's primary email if public email is not available
    let userEmail = userData.email;
    if (!userEmail) {
      console.log('Public email not available, fetching user emails from GitHub');
      try {
        const emailResponse = await fetch('https://api.github.com/user/emails', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        });
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          // Find the primary email
          const primaryEmail = emailData.find((email: any) => email.primary);
          if (primaryEmail) {
            userEmail = primaryEmail.email;
            console.log('Found primary email:', userEmail);
          } else {
            // Fallback to first verified email
            const verifiedEmail = emailData.find((email: any) => email.verified);
            if (verifiedEmail) {
              userEmail = verifiedEmail.email;
              console.log('Using first verified email:', userEmail);
            } else {
              // Last resort: use constructed email
              userEmail = `${userData.login}@github.com`;
              console.warn('No verified emails found, using fallback:', userEmail);
            }
          }
        } else {
          console.warn('Failed to fetch user emails, using fallback');
          userEmail = `${userData.login}@github.com`;
        }
      } catch (emailError) {
        console.error('Error fetching user emails:', emailError);
        userEmail = `${userData.login}@github.com`;
      }
    }
    
    // Create or update user in database
    console.log('Creating or updating user in database:', userData.id);
    try {      const user = await prisma.user.upsert({
        where: { 
          githubId: String(userData.id) 
        },        update: {
          name: userData.name || userData.login,
          avatarUrl: userData.avatar_url,
          githubLogin: userData.login,
          githubAccessToken: tokenData.access_token,
          bio: userData.bio,
          location: userData.location,
          company: userData.company,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          publicRepos: userData.public_repos,
          publicGists: userData.public_gists,
          followers: userData.followers,
          following: userData.following,
          hireable: userData.hireable,
          githubCreatedAt: userData.created_at ? new Date(userData.created_at) : null,
        },
        create: {
          githubId: String(userData.id),
          name: userData.name || userData.login,
          email: userEmail,
          avatarUrl: userData.avatar_url,
          githubLogin: userData.login,
          githubAccessToken: tokenData.access_token,
          bio: userData.bio,
          location: userData.location,
          company: userData.company,
          blog: userData.blog,
          twitterUsername: userData.twitter_username,
          publicRepos: userData.public_repos,
          publicGists: userData.public_gists,
          followers: userData.followers,
          following: userData.following,
          hireable: userData.hireable,
          githubCreatedAt: userData.created_at ? new Date(userData.created_at) : null,
          credits: 150, // Give new users 150 starting credits
        },
      });
      
      console.log('✅ User successfully created/updated in database:', {
        id: user.id,
        githubId: user.githubId,
        name: user.name,
        email: user.email,
        credits: user.credits,
        isNewUser: (new Date().getTime() - user.createdAt.getTime()) < 60000
      });
      
      // Check if this is a new user (created within the last minute)
      const isNewUser = (new Date().getTime() - user.createdAt.getTime()) < 60000;
        // Create JWT token
      console.log('Creating JWT token for user:', user.id);
      const token = await createToken({
        id: user.id,
        email: user.email,
        githubId: user.githubId
      });
        // Set secure cookies
      await setAuthCookie(token);
      
      // Redirect to dashboard with welcome message for new users
      const redirectUrl = isNewUser 
        ? `${process.env.FRONTEND_URL}/dashboard?welcome=true` 
        : `${process.env.FRONTEND_URL}/dashboard`;
      
      console.log('Authentication successful, redirecting to:', redirectUrl);
      return NextResponse.redirect(redirectUrl);
    } catch (dbError) {
      console.error('Database error during user upsert:', dbError);
      return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth?error=Database error`);
    }  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.FRONTEND_URL}/auth?error=Authentication failed`);
  }
}
