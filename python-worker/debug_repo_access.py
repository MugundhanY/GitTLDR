#!/usr/bin/env python3
"""
Debug script to test GitHub API access and find the correct repository details.
"""
import asyncio
import sys
import os
import aiohttp

# Add the python-worker directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)

async def test_github_api_access():
    """Test GitHub API access and find repository details."""
    
    settings = get_settings()
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitTLDR-CommitAnalyzer/1.0"
    }
    
    # Add authorization header if available
    if settings.github_token and settings.github_token != "your-github-token":
        headers["Authorization"] = f"token {settings.github_token}"
        print("🔑 Using authenticated GitHub API requests")
        print(f"📱 Token starts with: {settings.github_token[:8]}..." if len(settings.github_token) > 8 else "Token too short")
    else:
        print("⚠️  No GitHub token configured - using unauthenticated requests")
        print("⚠️  This may result in rate limiting and limited access to private repos")
    
    async with aiohttp.ClientSession(headers=headers) as session:
        
        # Test 1: Check authenticated user details
        print("\n=== Test 1: Check authenticated user ===")
        try:
            async with session.get("https://api.github.com/user") as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    user_data = await response.json()
                    print(f"✅ Authenticated as: {user_data.get('login', 'Unknown')}")
                    print(f"📧 Email: {user_data.get('email', 'Not provided')}")
                    print(f"👤 Name: {user_data.get('name', 'Not provided')}")
                    
                    # Now we know the correct username
                    actual_username = user_data.get('login')
                    
                elif response.status == 401:
                    print("❌ Authentication failed - invalid token")
                    return
                else:
                    print(f"❌ Unexpected response: {response.status}")
                    error_text = await response.text()
                    print(f"Error: {error_text}")
                    return
        except Exception as e:
            print(f"❌ Error checking user: {str(e)}")
            return
        
        # Test 2: List user's repositories to find the correct name
        print(f"\n=== Test 2: List repositories for {actual_username} ===")
        try:
            async with session.get(f"https://api.github.com/users/{actual_username}/repos") as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    repos = await response.json()
                    print(f"✅ Found {len(repos)} repositories")
                    
                    # Look for GitTLDR or similar names
                    gitldr_repos = []
                    for repo in repos:
                        repo_name = repo.get('name', '').lower()
                        if 'git' in repo_name or 'tldr' in repo_name or 'commit' in repo_name:
                            gitldr_repos.append(repo)
                    
                    if gitldr_repos:
                        print(f"\n📦 Found {len(gitldr_repos)} potentially relevant repositories:")
                        for repo in gitldr_repos:
                            print(f"  - {repo.get('full_name')} ({repo.get('description', 'No description')})")
                            print(f"    Private: {repo.get('private', False)}")
                            print(f"    Default branch: {repo.get('default_branch', 'main')}")
                    else:
                        print("\n📦 All repositories:")
                        for repo in repos[:10]:  # Show first 10
                            print(f"  - {repo.get('full_name')} ({repo.get('description', 'No description')})")
                        if len(repos) > 10:
                            print(f"  ... and {len(repos) - 10} more")
                            
                else:
                    print(f"❌ Failed to list repositories: {response.status}")
                    error_text = await response.text()
                    print(f"Error: {error_text}")
                    
        except Exception as e:
            print(f"❌ Error listing repositories: {str(e)}")
        
        # Test 3: Try common repository name variations
        print(f"\n=== Test 3: Test common repository name variations ===")
        possible_names = [
            f"{actual_username}/GitTLDR",
            f"{actual_username}/gitTLDR", 
            f"{actual_username}/git-tldr",
            f"{actual_username}/GitTldr",
            f"{actual_username}/GITLDR"
        ]
        
        for repo_name in possible_names:
            try:
                async with session.get(f"https://api.github.com/repos/{repo_name}") as response:
                    if response.status == 200:
                        repo_data = await response.json()
                        print(f"✅ Found repository: {repo_name}")
                        print(f"   Description: {repo_data.get('description', 'No description')}")
                        print(f"   Private: {repo_data.get('private', False)}")
                        print(f"   Default branch: {repo_data.get('default_branch', 'main')}")
                        
                        # Test getting commits from this repo
                        print(f"\n=== Testing commits for {repo_name} ===")
                        await test_repo_commits(session, repo_name)
                        
                    elif response.status == 404:
                        print(f"❌ Not found: {repo_name}")
                    else:
                        print(f"⚠️  {repo_name}: Status {response.status}")
                        
            except Exception as e:
                print(f"❌ Error testing {repo_name}: {str(e)}")

async def test_repo_commits(session, repo_name):
    """Test getting commits from a specific repository."""
    try:
        # Get recent commits
        async with session.get(f"https://api.github.com/repos/{repo_name}/commits?per_page=5") as response:
            if response.status == 200:
                commits = await response.json()
                print(f"✅ Found {len(commits)} recent commits:")
                
                for i, commit in enumerate(commits):
                    sha = commit.get('sha', 'Unknown')[:8]
                    message = commit.get('commit', {}).get('message', 'No message')
                    author = commit.get('commit', {}).get('author', {}).get('name', 'Unknown')
                    date = commit.get('commit', {}).get('author', {}).get('date', 'Unknown')
                    
                    print(f"  {i+1}. {sha} - {message[:50]}{'...' if len(message) > 50 else ''}")
                    print(f"     Author: {author}, Date: {date}")
                    
                    # Check if this looks like the commit we're looking for
                    if 'requirements' in message.lower() and 'bea69db2' in sha:
                        print(f"     🎯 THIS MIGHT BE THE COMMIT WE'RE LOOKING FOR!")
                    
                    # Test getting file changes for the first commit
                    if i == 0:
                        print(f"\n     Testing file changes for commit {sha}...")
                        await test_commit_files(session, repo_name, commit.get('sha'))
                        
            elif response.status == 404:
                print(f"❌ Repository {repo_name} not found or no commits")
            else:
                print(f"❌ Error getting commits: Status {response.status}")
                error_text = await response.text()
                print(f"Error: {error_text}")
                
    except Exception as e:
        print(f"❌ Error testing commits: {str(e)}")

async def test_commit_files(session, repo_name, commit_sha):
    """Test getting file changes for a specific commit."""
    try:
        async with session.get(f"https://api.github.com/repos/{repo_name}/commits/{commit_sha}") as response:
            if response.status == 200:
                commit_data = await response.json()
                files = commit_data.get('files', [])
                print(f"     ✅ Commit has {len(files)} changed files:")
                
                for file_info in files[:3]:  # Show first 3 files
                    filename = file_info.get('filename', 'Unknown')
                    status = file_info.get('status', 'Unknown')
                    additions = file_info.get('additions', 0)
                    deletions = file_info.get('deletions', 0)
                    print(f"       - {filename} ({status}): +{additions} -{deletions}")
                
                if len(files) > 3:
                    print(f"       ... and {len(files) - 3} more files")
                    
            else:
                print(f"     ❌ Could not get commit details: Status {response.status}")
                
    except Exception as e:
        print(f"     ❌ Error getting commit files: {str(e)}")

async def main():
    """Main debug function."""
    print("🔍 Debugging GitHub API access and repository details...")
    await test_github_api_access()

if __name__ == "__main__":
    asyncio.run(main())
