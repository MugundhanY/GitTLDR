#!/usr/bin/env python3
"""
Simple script to list all commits in the repository to see what actually exists.
"""
import asyncio
from services.github_commit_service import github_commit_service

async def list_all_commits():
    """List all commits in the repository."""
    print("📋 Listing all commits in MugundhanY/GitTLDR...")
    print("=" * 60)
    
    owner = "MugundhanY"
    repo = "GitTLDR"
    
    try:
        # Get recent commits using the public method
        recent_commits = await github_commit_service.get_recent_commits(owner, repo, limit=100)
        
        if recent_commits:
            print(f"Found {len(recent_commits)} recent commits:")
            print()
            
            for i, commit in enumerate(recent_commits, 1):
                sha = commit.get('sha', '')
                message = commit.get('message', '').split('\n')[0]
                author = commit.get('author', {}).get('name', 'Unknown')
                date = commit.get('author', {}).get('date', '')
                
                print(f"{i:2d}. {sha}")
                print(f"    Message: {message}")
                print(f"    Author:  {author}")
                print(f"    Date:    {date}")
                print()
                
                # Check if this commit starts with our target
                if sha.startswith('bea69db2'):
                    print(f"✅ FOUND MATCH! This commit starts with 'bea69db2'")
                    print(f"    Full SHA: {sha}")
                    print()
                    
                    # Now test getting this specific commit with file details
                    print("🔍 Testing file details for this commit...")
                    specific_commit = await github_commit_service.get_commit_by_sha(
                        owner, repo, sha, include_files=True
                    )
                    
                    if specific_commit:
                        files_changed = specific_commit.get('files_changed', [])
                        print(f"    Files changed: {len(files_changed)}")
                        for file_info in files_changed:
                            print(f"      - {file_info.get('filename', 'Unknown')}: {file_info.get('status', 'Unknown')}")
                    else:
                        print("    ❌ Could not get detailed commit info")
                    print()
                    
        else:
            print("❌ No commits found or error accessing repository")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(list_all_commits())
