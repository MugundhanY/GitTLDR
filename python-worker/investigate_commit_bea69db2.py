#!/usr/bin/env python3
"""
Investigate the bea69db2 commit issue - check what's actually in the repository
"""

import asyncio
from services.github_commit_service import github_commit_service
from utils.logger import get_logger

logger = get_logger(__name__)

async def investigate_commit():
    """Investigate the bea69db2 commit issue"""
    
    print("🔍 Investigating commit bea69db2 issue...")
    print("=" * 60)
    
    repo_owner = "MugundhanY"
    repo_name = "GitTLDR"
    target_commit = "bea69db2"
    
    print(f"Repository: {repo_owner}/{repo_name}")
    print(f"Target commit: {target_commit}")
    print()
    
    try:
        # 1. Check if repository exists and get basic info
        print("1. Checking repository existence...")
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                repo_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}"
                headers = {}
                
                # Add auth if available
                import os
                github_token = os.getenv('GITHUB_TOKEN')
                if github_token:
                    headers['Authorization'] = f'token {github_token}'
                    print("   Using authenticated requests")
                else:
                    print("   Using unauthenticated requests")
                
                response = await client.get(repo_url, headers=headers)
                if response.status_code == 200:
                    repo_data = response.json()
                    print(f"   ✅ Repository found: {repo_data.get('full_name')}")
                    print(f"   Default branch: {repo_data.get('default_branch')}")
                    print(f"   Private: {repo_data.get('private')}")
                    print(f"   Fork: {repo_data.get('fork')}")
                elif response.status_code == 404:
                    print(f"   ❌ Repository not found (404)")
                    return
                else:
                    print(f"   ⚠️ Unexpected response: {response.status_code}")
                    return
        except Exception as e:
            print(f"   ❌ Error checking repository: {str(e)}")
            return
        
        print()
        
        # 2. Get recent commits to see what's actually there
        print("2. Getting recent commits...")
        try:
            recent_commits = await github_commit_service.get_recent_commits(repo_owner, repo_name, limit=10)
            if recent_commits:
                print(f"   ✅ Found {len(recent_commits)} recent commits:")
                for i, commit in enumerate(recent_commits, 1):
                    sha = commit.get('sha', 'unknown')
                    message = commit.get('commit', {}).get('message', 'No message')
                    author = commit.get('commit', {}).get('author', {}).get('name', 'Unknown')
                    date = commit.get('commit', {}).get('author', {}).get('date', 'Unknown')
                    
                    # Truncate message for display
                    short_message = message.split('\n')[0][:60]
                    if len(message) > 60:
                        short_message += "..."
                    
                    print(f"   {i:2d}. {sha[:8]} - {short_message}")
                    print(f"       Author: {author}, Date: {date[:10]}")
                    
                    # Check if this matches our target
                    if sha.startswith(target_commit):
                        print(f"       🎯 FOUND MATCH! Full SHA: {sha}")
            else:
                print("   ❌ No recent commits found")
        except Exception as e:
            print(f"   ❌ Error getting recent commits: {str(e)}")
        
        print()
        
        # 3. Try to search for commits that start with "bea69db2"
        print("3. Searching for commits starting with 'bea69db2'...")
        try:
            # Try different variations of the commit SHA
            variations = [
                "bea69db2",
                target_commit,
                f"{target_commit}*"  # Wildcard search not supported in GitHub API
            ]
            
            for variation in variations:
                print(f"   Trying: {variation}")
                try:
                    commit = await github_commit_service.get_commit(repo_owner, repo_name, variation)
                    if commit:
                        sha = commit.get('sha', 'unknown')
                        message = commit.get('commit', {}).get('message', 'No message')
                        print(f"   ✅ Found commit: {sha}")
                        print(f"   Message: {message.split(chr(10))[0][:100]}")
                        break
                except Exception as e:
                    print(f"   ❌ {variation}: {str(e)}")
            else:
                print("   ❌ No matching commits found with any variation")
        except Exception as e:
            print(f"   ❌ Error in commit search: {str(e)}")
        
        print()
        
        # 4. Try different possible repositories
        print("4. Checking if commit exists in related repositories...")
        possible_repos = [
            ("MugundhanY", "GitTLDR"),
            ("MugundhanY", "gittldr"),  # lowercase
            ("mugundhan", "GitTLDR"),  # different case
            ("mugundhan", "gittldr"),
        ]
        
        for owner, name in possible_repos:
            if owner == repo_owner and name == repo_name:
                continue  # Already checked
                
            print(f"   Checking: {owner}/{name}")
            try:
                commit = await github_commit_service.get_commit(owner, name, target_commit)
                if commit:
                    sha = commit.get('sha', 'unknown')
                    message = commit.get('commit', {}).get('message', 'No message')
                    print(f"   🎯 FOUND in {owner}/{name}!")
                    print(f"   Full SHA: {sha}")
                    print(f"   Message: {message.split(chr(10))[0][:100]}")
                    break
            except Exception as e:
                print(f"   ❌ Not found in {owner}/{name}: {str(e)}")
        
        print()
        
        # 5. Final recommendations
        print("5. RECOMMENDATIONS:")
        print("=" * 40)
        print("If the commit was not found:")
        print("• Verify the correct repository name and owner")
        print("• Check if the commit exists in a fork or different branch")
        print("• Ensure the commit SHA is complete (at least 7 characters)")
        print("• Verify GitHub token has access to the repository")
        print("• The commit might be in a private repository")
        print("• The commit might have been rebased or removed")
        
    except Exception as e:
        logger.error(f"Investigation failed: {str(e)}")
        print(f"❌ Investigation failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(investigate_commit())
