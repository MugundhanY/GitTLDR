import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {    // Get authenticated user with full data
    const user = await getUserFromRequest(req, true);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let response;
    let hasAccessToken = !!user.githubAccessToken;
    
    if (user.githubAccessToken) {
      // Use authenticated API to get both public and private repos
      response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner', {
        headers: {
          'Authorization': `token ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitTLDR'
        }
      });
    } else if (user.githubLogin) {
      // Fallback to public API (only shows public repos)
      response = await fetch(`https://api.github.com/users/${user.githubLogin}/repos?sort=updated&per_page=50`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitTLDR'
        }
      });
    } else {
      return NextResponse.json({ error: 'GitHub username not found' }, { status: 400 });
    }

    if (!response.ok) {
      console.error('GitHub API error:', response.status, response.statusText);
      return NextResponse.json({ 
        error: 'Failed to fetch repositories from GitHub',
        hasAccessToken,
        publicOnly: !hasAccessToken 
      }, { status: response.status });
    }

    const repos = await response.json();
    
    // Return repos with metadata about access level
    return NextResponse.json({
      repositories: repos,
      hasAccessToken,
      publicOnly: !hasAccessToken,
      totalCount: repos.length
    });

  } catch (error) {
    console.error('Error fetching GitHub repositories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
