import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req, true);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { issueFixId } = await req.json();
    
    // Get IssueFix with repository info
    const issueFix = await prisma.issueFix.findUnique({
      where: { id: issueFixId },
      include: { repository: true }
    });
    
    if (!issueFix || issueFix.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    if (issueFix.status !== 'READY_FOR_REVIEW') {
      return NextResponse.json({ error: 'Fix not ready' }, { status: 400 });
    }
    
    if (!user.githubAccessToken) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }
    
    // Create PR on GitHub
    const [owner, repo] = issueFix.repository.fullName.split('/');
    
    // Check if user owns this repository or needs to fork
    const userLogin = user.githubLogin || user.email?.split('@')[0] || 'user';
    const isOwner = owner.toLowerCase() === userLogin.toLowerCase();
    
    let targetOwner = owner;
    let targetRepo = repo;
    
    // If user doesn't own the repo, fork it first
    if (!isOwner) {
      console.log(`User ${userLogin} is not owner of ${owner}/${repo}, checking for fork...`);
      
      // Check if user already has a fork
      const forksResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/forks?per_page=100`,
        {
          headers: {
            'Authorization': `token ${user.githubAccessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      const forks = await forksResponse.json();
      let userFork = forks.find((fork: any) => 
        fork.owner.login.toLowerCase() === userLogin.toLowerCase()
      );
      
      // If no fork exists, create one
      if (!userFork) {
        console.log(`Creating fork of ${owner}/${repo} for ${userLogin}...`);
        
        const forkResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/forks`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${user.githubAccessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (!forkResponse.ok) {
          const errorData = await forkResponse.json();
          console.error('Fork creation failed:', errorData);
          return NextResponse.json({ 
            error: `Failed to fork repository: ${errorData.message}` 
          }, { status: forkResponse.status });
        }
        
        userFork = await forkResponse.json();
        
        // Wait a few seconds for fork to be ready
        console.log('Waiting for fork to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.log(`Found existing fork: ${userFork.full_name}`);
      }
      
      // Use the fork for creating branch and commits
      targetOwner = userFork.owner.login;
      targetRepo = userFork.name;
    }
    
    // 1. Get default branch (from fork if not owner)
    const repoResponse = await fetch(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}`,
      {
        headers: {
          'Authorization': `token ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || 'main';
    
    // 2. Get latest commit SHA from default branch (from fork if not owner)
    const refResponse = await fetch(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/refs/heads/${defaultBranch}`,
      {
        headers: {
          'Authorization': `token ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    const refData = await refResponse.json();
    const latestCommitSha = refData.object.sha;
    
    // 3. Create new branch (in fork if not owner)
    const branchName = `gittldr-fix-issue-${issueFix.issueNumber}`;
    
    await fetch(
      `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/refs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: latestCommitSha
        })
      }
    );
    
    // 4. Commit changes
    const proposedFix = issueFix.proposedFix as any;
    
    // Handle the operations array from the backend
    const operations = proposedFix.operations || [];
    
    for (const operation of operations) {
      const filePath = operation.path;
      const operationType = operation.type; // 'create', 'edit', 'delete'
      
      if (operationType === 'delete') {
        // Handle file deletion
        // First, get the file SHA
        const fileResponse = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}?ref=${branchName}`,
          {
            headers: {
              'Authorization': `token ${user.githubAccessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          
          // Delete the file
          await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `token ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Fix: ${issueFix.issueTitle} - Delete ${filePath}`,
                sha: fileData.sha,
                branch: branchName
              })
            }
          );
        }
      } else if (operationType === 'create') {
        // Handle file creation
        // First check if file already exists
        const checkResponse = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}?ref=${branchName}`,
          {
            headers: {
              'Authorization': `token ${user.githubAccessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (checkResponse.ok) {
          // File already exists - convert to edit operation
          console.log(`File ${filePath} already exists, skipping create operation`);
          const fileData = await checkResponse.json();
          
          // Update existing file with new content
          await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Fix: ${issueFix.issueTitle} - Update ${filePath}`,
                content: Buffer.from(operation.content || '').toString('base64'),
                branch: branchName,
                sha: fileData.sha
              })
            }
          );
        } else {
          // File doesn't exist - create it
          await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Fix: ${issueFix.issueTitle} - Create ${filePath}`,
                content: Buffer.from(operation.content || '').toString('base64'),
                branch: branchName
              })
            }
          );
        }
      } else if (operationType === 'edit') {
        // Handle file editing with search/replace patterns (GitHub Copilot style)
        // Get current file content
        const fileResponse = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}?ref=${branchName}`,
          {
            headers: {
              'Authorization': `token ${user.githubAccessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          let fileContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
          
          // Track if any edits were applied
          let editsApplied = 0;
          let editsFailed = 0;
          
          // Apply each edit in sequence
          const edits = operation.edits || [];
          for (const edit of edits) {
            // Support both formats:
            // 1. Line-based: {start_line, end_line, old_code, new_code}
            // 2. Search/replace: {search, replace}
            
            if (edit.start_line !== undefined && edit.end_line !== undefined) {
              // LINE-BASED FORMAT (more reliable!)
              const lines = fileContent.split('\n');
              const startIdx = edit.start_line - 1;  // Convert to 0-based
              const endIdx = edit.end_line - 1;
              
              // Verify the old_code matches (safety check)
              const actualOldCode = lines.slice(startIdx, endIdx + 1).join('\n');
              const expectedOldCode = (edit.old_code || '').trim();
              
              if (actualOldCode.trim() === expectedOldCode || !expectedOldCode) {
                // Replace lines start_line to end_line with new_code
                const newLines = (edit.new_code || '').split('\n');
                lines.splice(startIdx, endIdx - startIdx + 1, ...newLines);
                fileContent = lines.join('\n');
                editsApplied++;
                console.log(`✅ Applied line-based edit to ${filePath} (lines ${edit.start_line}-${edit.end_line})`);
              } else {
                editsFailed++;
                console.warn(`⚠️ Line-based edit failed - old_code doesn't match actual code in ${filePath}`);
                console.warn(`Expected (lines ${edit.start_line}-${edit.end_line}):`, expectedOldCode.substring(0, 100));
                console.warn(`Actual:`, actualOldCode.substring(0, 100));
              }
            } else {
              // SEARCH/REPLACE FORMAT (legacy, less reliable)
              const searchPattern = edit.search;
              const replaceWith = edit.replace;
              
              // Apply the search/replace
              if (fileContent.includes(searchPattern)) {
                fileContent = fileContent.replace(searchPattern, replaceWith);
                editsApplied++;
                console.log(`✅ Applied search/replace edit to ${filePath}`);
              } else {
                editsFailed++;
                console.warn(`⚠️ Search pattern not found in ${filePath}`);
                console.warn(`Expected pattern (first 100 chars):`, searchPattern?.substring(0, 100));
                
                // Try fuzzy matching: normalize whitespace and try again
                const normalizedSearch = searchPattern?.replace(/\s+/g, ' ').trim();
                const normalizedContent = fileContent.replace(/\s+/g, ' ');
                
                if (normalizedSearch && normalizedContent.includes(normalizedSearch)) {
                  console.log(`⚠️ Found with normalized whitespace, attempting careful replacement...`);
                  // This is risky but better than skipping
                  fileContent = fileContent.replace(
                    new RegExp(searchPattern.replace(/\s+/g, '\\s+'), 'g'),
                    replaceWith
                  );
                  editsApplied++;
                  editsFailed--;
                }
              }
            }
          }
          
          // Log summary
          console.log(`Edit summary for ${filePath}: ${editsApplied} applied, ${editsFailed} failed`);
          
          // Update the file with the edited content
          await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Fix: ${issueFix.issueTitle} - Edit ${filePath}`,
                content: Buffer.from(fileContent).toString('base64'),
                sha: fileData.sha,
                branch: branchName
              })
            }
          );
        }
      } else if (operationType === 'modify') {
        // Handle file modification (legacy - full file replacement)
        // Get file SHA
        const fileResponse = await fetch(
          `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}?ref=${branchName}`,
          {
            headers: {
              'Authorization': `token ${user.githubAccessToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          
          // Update file
          await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${user.githubAccessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Fix: ${issueFix.issueTitle} - Update ${filePath}`,
                content: Buffer.from(operation.content || '').toString('base64'),
                sha: fileData.sha,
                branch: branchName
              })
            }
          );
        }
      }
    }
    
    // 5. Create PR (to original repo, from fork if not owner)
    const prResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${user.githubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Fix #${issueFix.issueNumber}: ${issueFix.issueTitle}`,
          body: `${issueFix.explanation}\n\nFixes #${issueFix.issueNumber}`,
          head: isOwner ? branchName : `${targetOwner}:${branchName}`, // Format: 'user:branch' for forks
          base: defaultBranch
        })
      }
    );
    
    const prData = await prResponse.json();
    
    // Update IssueFix record
    await prisma.issueFix.update({
      where: { id: issueFixId },
      data: {
        status: 'COMPLETED',
        prNumber: prData.number,
        prUrl: prData.html_url,
        prCreatedAt: new Date(),
        completedAt: new Date()
      }
    });
    
    return NextResponse.json({ 
      success: true,
      prUrl: prData.html_url,
      prNumber: prData.number
    });
    
  } catch (error) {
    console.error('Error creating PR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
