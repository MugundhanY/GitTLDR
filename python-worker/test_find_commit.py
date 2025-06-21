#!/usr/bin/env python3
"""
Test script to find and analyze a specific commit with detailed file modifications.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.github_commit_service import GitHubCommitService
from utils.logger import get_logger

logger = get_logger(__name__)

async def find_and_analyze_commit():
    """Find and analyze a specific commit with file details."""
    
    github_service = GitHubCommitService()
    
    # Commit info provided by user
    commit_sha = "bea69db2"
    commit_message = "Update requirements.txt"
    author_email = "122536258+MugundhanY@users.noreply.github.com"
    commit_date = "2024-10-17T19:13:32Z"
    
    print("🚀 Advanced Commit Search and Analysis")
    print("=" * 60)
    print(f"🔍 Looking for commit: {commit_sha}")
    print(f"📝 Expected message: {commit_message}")
    print(f"👤 Expected author: {author_email}")
    print(f"🕐 Expected date: {commit_date}")
    
    # Try different repositories and approaches
    repositories_to_try = [
        "MugundhanY/GitTLDR",
        "mugun/GitTLDR", 
        "Mugundhan/GitTLDR",
        "MugundhanY/gitTLDR"  # Case variations
    ]
    
    print(f"\n🔍 Searching across multiple repositories...")
    
    for repo_url in repositories_to_try:
        print(f"\n📂 Trying repository: {repo_url}")
        repo_owner, repo_name = github_service.parse_repository_from_url(repo_url)
        
        if not repo_owner or not repo_name:
            print(f"   ❌ Could not parse repository URL")
            continue
            
        try:
            # Method 1: Try direct commit lookup with different SHA lengths
            sha_variations = [
                commit_sha,  # Original
                commit_sha + "0123456789abcdef"[:16-len(commit_sha)],  # Pad to make longer
                commit_sha[:7],  # Shorter version
                commit_sha[:10]  # Medium length
            ]
            
            for sha_variant in sha_variations:
                print(f"   🔍 Trying SHA variant: {sha_variant}")
                commit = await github_service.get_commit_by_sha(repo_owner, repo_name, sha_variant, include_files=True)
                
                if commit:
                    print(f"   ✅ FOUND COMMIT!")
                    await display_commit_details(commit, sha_variant)
                    return commit
                else:
                    print(f"   ❌ Not found with SHA: {sha_variant}")
            
            # Method 2: Search by commit message
            print(f"   🔍 Searching by message: '{commit_message}'")
            commits = await github_service.search_commits_by_message(repo_owner, repo_name, commit_message, limit=10)
            
            if commits:
                print(f"   📊 Found {len(commits)} commits with similar message")
                for i, commit in enumerate(commits):
                    commit_sha_found = commit.get('sha', '')
                    if commit_sha.lower() in commit_sha_found.lower():
                        print(f"   ✅ FOUND MATCHING COMMIT!")
                        await display_commit_details(commit, commit_sha_found)
                        return commit
                    else:
                        print(f"   📝 Similar commit {i+1}: {commit_sha_found[:8]} - {commit.get('message', '')[:50]}...")
            
            # Method 3: Get recent commits and scan
            print(f"   🔍 Scanning recent commits...")
            recent_commits = await github_service.get_recent_commits(repo_owner, repo_name, limit=100)
            
            if recent_commits:
                for commit in recent_commits:
                    commit_sha_found = commit.get('sha', '')
                    if commit_sha.lower() in commit_sha_found.lower():
                        print(f"   ✅ FOUND IN RECENT COMMITS!")
                        # Get detailed version
                        detailed_commit = await github_service.get_commit_by_sha(repo_owner, repo_name, commit_sha_found, include_files=True)
                        if detailed_commit:
                            await display_commit_details(detailed_commit, commit_sha_found)
                            return detailed_commit
                        else:
                            await display_commit_details(commit, commit_sha_found)
                            return commit
                            
            print(f"   ❌ Commit not found in {repo_url}")
            
        except Exception as e:
            print(f"   ❌ Error searching {repo_url}: {str(e)}")
    
    print(f"\n❌ Commit {commit_sha} not found in any of the repositories tried.")
    print(f"\n💡 Suggestions:")
    print(f"   1. Check if the commit SHA is complete (should be 7-40 characters)")
    print(f"   2. Verify the repository name/owner")
    print(f"   3. Check if the repository is private (requires authentication)")
    print(f"   4. The commit might be in a fork or different branch")
    
    await github_service.close()
    return None

async def display_commit_details(commit, sha):
    """Display detailed commit information including file changes."""
    print(f"\n📋 COMMIT DETAILS")
    print(f"   📅 SHA: {sha}")
    print(f"   📝 Message: {commit.get('message', 'N/A')}")
    print(f"   👤 Author: {commit.get('author', {}).get('name', 'N/A')} ({commit.get('author', {}).get('email', 'N/A')})")
    print(f"   🕐 Date: {commit.get('timestamp', 'N/A')}")
    print(f"   🔗 URL: {commit.get('url', 'N/A')}")
    
    # File changes
    files_changed = commit.get('files_changed', [])
    if files_changed:
        print(f"\n📂 FILES CHANGED ({len(files_changed)} files):")
        print("   " + "="*50)
        
        for i, file_info in enumerate(files_changed, 1):
            filename = file_info.get('filename', 'N/A')
            status = file_info.get('status', 'N/A')
            additions = file_info.get('additions', 0)
            deletions = file_info.get('deletions', 0)
            changes = file_info.get('changes', 0)
            
            status_emoji = {
                'added': '📄',
                'modified': '✏️',
                'deleted': '🗑️',
                'renamed': '📝'
            }.get(status, '📄')
            
            print(f"   {i:2d}. {status_emoji} {filename}")
            print(f"       Status: {status}")
            if additions > 0 or deletions > 0:
                print(f"       Changes: +{additions} -{deletions} (total: {changes})")
            print()
    else:
        print(f"\n⚠️  No file change information available")
        print(f"   This might be due to:")
        print(f"   - API limitations for this commit type")
        print(f"   - Large commit with too many files")
        print(f"   - Merge commit without detailed file info")
    
    # Additional stats
    stats = commit.get('stats', {})
    if stats:
        print(f"\n📊 COMMIT STATISTICS:")
        print(f"   Total additions: {stats.get('additions', 0)}")
        print(f"   Total deletions: {stats.get('deletions', 0)}")
        print(f"   Total changes: {stats.get('total', 0)}")

if __name__ == "__main__":
    asyncio.run(find_and_analyze_commit())
