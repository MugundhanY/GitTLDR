#!/usr/bin/env python3
"""
Test script specifically for commit bea69db2 to debug why file change information is missing.
"""
import asyncio
import sys
import os

# Add the python-worker directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.github_commit_service import GitHubCommitService
from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)

async def test_specific_commit():
    """Test the specific commit bea69db2 to see what data we get."""
    
    # Initialize the service
    service = GitHubCommitService()
    
    # Test with the user's repository and specific commit
    repo_owner = "MugundhanY"  # Your GitHub username
    repo_name = "GitTLDR"      # Your repository name
    commit_sha = "bea69db2"    # The specific commit you mentioned
    
    print(f"\n=== Testing Specific Commit {commit_sha} ===")
    print(f"Repository: {repo_owner}/{repo_name}")
    print(f"Commit SHA: {commit_sha}")
    
    try:
        # Get the commit with file details
        commit_data = await service.get_commit_by_sha(
            repo_owner=repo_owner,
            repo_name=repo_name,
            sha=commit_sha,
            include_files=True
        )
        
        if commit_data:
            print(f"\n✅ Successfully retrieved commit data")
            print(f"Message: {commit_data.get('message', 'N/A')}")
            print(f"Author: {commit_data.get('author', {}).get('name', 'N/A')}")
            print(f"Date: {commit_data.get('author', {}).get('date', 'N/A')}")
            
            files_changed = commit_data.get('files_changed', [])
            print(f"Files changed: {len(files_changed)} files")
            
            if files_changed:
                print("\nFile change details:")
                for i, file_info in enumerate(files_changed):
                    print(f"  {i+1}. {file_info.get('filename', 'Unknown')}")
                    print(f"     Status: {file_info.get('status', 'Unknown')}")
                    print(f"     Changes: +{file_info.get('additions', 0)} -{file_info.get('deletions', 0)}")
            else:
                print("❌ No file change information found")
                
                # Let's also test the raw GitHub API call to see what we get
                print("\n=== Testing Raw GitHub API ===")
                await test_raw_github_api(repo_owner, repo_name, commit_sha)
                
        else:
            print(f"❌ Could not retrieve commit {commit_sha}")
            
    except Exception as e:
        logger.error(f"Error testing commit: {str(e)}")
        print(f"❌ Error: {str(e)}")
    
    finally:
        # Clean up the session
        if service.session and not service.session.closed:
            await service.session.close()

async def test_raw_github_api(repo_owner: str, repo_name: str, commit_sha: str):
    """Test the raw GitHub API to see what data is available."""
    import aiohttp
    
    settings = get_settings()
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitTLDR-CommitAnalyzer/1.0"
    }
    
    # Add authorization header if available
    if settings.github_token and settings.github_token != "your-github-token":
        headers["Authorization"] = f"token {settings.github_token}"
        print("🔑 Using authenticated GitHub API requests")
    else:
        print("⚠️  Using unauthenticated GitHub API requests (rate limited)")
    
    async with aiohttp.ClientSession(headers=headers) as session:
        # Test the commit API endpoint
        url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/commits/{commit_sha}"
        print(f"📡 Testing URL: {url}")
        
        async with session.get(url) as response:
            print(f"📊 Response status: {response.status}")
            
            if response.status == 200:
                data = await response.json()
                
                print(f"✅ Raw API response structure:")
                print(f"   - Has 'files' key: {'files' in data}")
                print(f"   - Has 'stats' key: {'stats' in data}")
                
                if 'files' in data:
                    files = data['files']
                    print(f"   - Number of files: {len(files)}")
                    for i, file_info in enumerate(files[:3]):  # Show first 3 files
                        print(f"     {i+1}. {file_info.get('filename', 'Unknown')}")
                else:
                    print("   ❌ No 'files' key in response")
                    
                if 'stats' in data:
                    stats = data['stats']
                    print(f"   - Stats: {stats}")
                else:
                    print("   ❌ No 'stats' key in response")
                    
                # Print all top-level keys
                print(f"   - All keys: {list(data.keys())}")
                
            elif response.status == 404:
                print("❌ Commit not found (404)")
            else:
                error_text = await response.text()
                print(f"❌ API Error {response.status}: {error_text}")

async def main():
    """Main test function."""
    print("🔍 Testing specific commit bea69db2 for file change information...")
    await test_specific_commit()

if __name__ == "__main__":
    asyncio.run(main())
