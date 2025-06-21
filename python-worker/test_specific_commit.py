#!/usr/bin/env python3
"""
Test script to get detailed file modification information for a specific commit.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.github_commit_service import GitHubCommitService
from utils.logger import get_logger

logger = get_logger(__name__)

async def get_commit_details(repo_owner: str, repo_name: str, commit_sha: str):
    """Get detailed file modification information for a specific commit."""
    
    print(f"🔍 Fetching detailed information for commit: {commit_sha}")
    print(f"📂 Repository: {repo_owner}/{repo_name}")
    print("=" * 60)
    
    github_service = GitHubCommitService()
    
    try:
        # Get commit details with file information
        commit = await github_service.get_commit_by_sha(
            repo_owner, repo_name, commit_sha, include_files=True
        )
        
        if commit:
            print(f"✅ Successfully retrieved commit details")
            print(f"📅 SHA: {commit.get('sha', 'N/A')}")
            print(f"📝 Message: {commit.get('message', 'N/A')}")
            print(f"👤 Author: {commit.get('author', {}).get('name', 'N/A')}")
            print(f"📧 Email: {commit.get('author', {}).get('email', 'N/A')}")
            print(f"🕐 Date: {commit.get('timestamp', 'N/A')}")
            print(f"🔗 URL: {commit.get('url', 'N/A')}")
            
            # Get file change details
            files_changed = commit.get('files_changed', [])
            stats = commit.get('stats', {})
            
            print(f"\n📊 Commit Statistics:")
            print(f"   Total additions: {stats.get('additions', 0)}")
            print(f"   Total deletions: {stats.get('deletions', 0)}")
            print(f"   Total changes: {stats.get('total', 0)}")
            
            if files_changed:
                print(f"\n📂 Files Modified ({len(files_changed)} files):")
                print("-" * 50)
                
                for i, file_info in enumerate(files_changed, 1):
                    filename = file_info.get('filename', 'N/A')
                    status = file_info.get('status', 'N/A')
                    additions = file_info.get('additions', 0)
                    deletions = file_info.get('deletions', 0)
                    changes = file_info.get('changes', 0)
                    
                    print(f"{i:2d}. {filename}")
                    print(f"    Status: {status}")
                    print(f"    Changes: +{additions}/-{deletions} ({changes} total)")
                    print()
            else:
                print(f"\n⚠️  No file change information available")
                print("This might be due to:")
                print("- Very large commits (GitHub API limitation)")
                print("- Merge commits without explicit file changes")
                print("- API response truncation")
                
        else:
            print(f"❌ Could not retrieve commit {commit_sha}")
            print("Possible reasons:")
            print("- Commit SHA not found")
            print("- Repository access issues")
            print("- API rate limiting")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        
    finally:
        await github_service.close()

async def main():
    """Main function to test specific commit details."""
    
    # Test with the commit mentioned by the user
    commit_sha = "bea69db2"
    
    # You can modify these based on your actual repository
    # For now, I'll try a few common repository patterns
    test_repos = [
        ("MugundhanY", "GitTLDR"),  # Most likely based on the author email
        ("mugundhan", "GitTLDR"),   # Alternative case
        ("Mugundhan", "GitTLDR"),   # Alternative case
    ]
    
    print("🚀 Testing Commit File Details Extraction")
    print("=" * 60)
    
    for repo_owner, repo_name in test_repos:
        print(f"\n🧪 Trying repository: {repo_owner}/{repo_name}")
        
        try:
            await get_commit_details(repo_owner, repo_name, commit_sha)
            break  # Stop if we find the commit successfully
        except Exception as e:
            print(f"❌ Failed for {repo_owner}/{repo_name}: {str(e)}")
            continue
    
    print(f"\n🎯 Test Complete!")

if __name__ == "__main__":
    asyncio.run(main())
