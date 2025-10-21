import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {  // Get authenticated user first, outside try-catch for scope
  const user = await getUserFromRequest(req, true);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { owner, repo, githubUrl } = body;

    let apiUrl: string;
    let headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitTLDR'
    };

    // If user has GitHub access token, use authenticated requests
    if (user.githubAccessToken) {
      headers['Authorization'] = `token ${user.githubAccessToken}`;
    }

    // Determine API URL based on input
    if (githubUrl) {
      const urlMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!urlMatch) {
        return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
      }
      apiUrl = `https://api.github.com/repos/${urlMatch[1]}/${urlMatch[2]}/contents`;
    } else if (owner && repo) {
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    } else {
      return NextResponse.json({ error: 'Missing repository information' }, { status: 400 });
    }    // Get repository contents recursively
    const fileCount = await getRepositoryFileCount(apiUrl, headers);
    
    console.log('Repository check - Owner:', owner, 'Repo:', repo, 'API URL:', apiUrl);
    
    // Calculate credits needed (1 file = 1 credit, 0 files = 0 credits)
    const creditsNeeded = fileCount;
    const hasEnoughCredits = fileCount === 0 ? true : user.credits >= creditsNeeded;    return NextResponse.json({
      fileCount,
      creditsNeeded,
      hasEnoughCredits,
      userCredits: user.credits,
      isEmpty: fileCount === 0
    });  } catch (error) {
    console.error('Error checking repository:', error);
    
    // Provide more specific error messages
    if (error instanceof Error && error.message.includes('GitHub API error: 404')) {
      return NextResponse.json({ 
        error: 'Repository not found or is private and requires authentication',
        fileCount: 0,
        creditsNeeded: 0,
        hasEnoughCredits: false,
        userCredits: user?.credits || 0
      }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to check repository' }, { status: 500 });
  }
}

async function getRepositoryFileCount(apiUrl: string, headers: Record<string, string>, path: string = ''): Promise<number> {
  try {
    const fullUrl = `${apiUrl}${path}`;
    console.log('Fetching URL:', fullUrl);
    const response = await fetch(fullUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const contents = await response.json();
    let fileCount = 0;

    // If it's a single file (not an array), count it
    if (!Array.isArray(contents)) {
      return contents.type === 'file' ? 1 : 0;
    }

    // Process each item in the directory
    for (const item of contents) {
      if (item.type === 'file') {
        // Skip certain files that don't need processing
        if (shouldSkipFile(item.name)) {
          continue;
        }
        fileCount++;
      } else if (item.type === 'dir') {
        // Skip certain directories
        if (shouldSkipDirectory(item.name)) {
          continue;
        }
        // Recursively count files in subdirectories (limit depth to avoid infinite loops)
        if (path.split('/').length < 10) {
          const subDirCount = await getRepositoryFileCount(
            apiUrl.replace('/contents', ''),
            headers,
            `/contents/${item.path}`
          );
          fileCount += subDirCount;
        }
      }
    }    return fileCount;
  } catch (error) {
    console.error('Error counting files:', error);
    // Don't return a default value, let the error bubble up
    throw error;
  }
}

function shouldSkipFile(fileName: string): boolean {
  const skipExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.pdf', '.zip', '.tar', '.gz'];
  const skipFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', 'Thumbs.db'];
  
  const ext = fileName.toLowerCase();
  return skipExtensions.some(skipExt => ext.endsWith(skipExt)) || 
         skipFiles.includes(fileName);
}

function shouldSkipDirectory(dirName: string): boolean {
  const skipDirs = [
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage', 
    '.vscode', '.idea', 'vendor', 'target', 'bin', 'obj', '__pycache__',
    '.pytest_cache', '.venv', 'venv', 'env'
  ];
  
  return skipDirs.includes(dirName) || dirName.startsWith('.');
}
