#!/usr/bin/env python3
"""
Simple script to find commits related to requirements.txt updates.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.github_commit_service import GitHubCommitService
from utils.logger import get_logger

logger = get_logger(__name__)

async def find_requirements_commits():
    """Find commits that modified requirements.txt."""
    
    github_service = GitHubCommitService()
    
    print("🔍 Searching for requirements.txt related commits")
    print("=" * 50)
    
    repo_owner = "MugundhanY"
    repo_name = "GitTLDR"
    
    try:
        # Method 1: Search commits affecting requirements.txt file
        print(f"📂 Searching in repository: {repo_owner}/{repo_name}")
        print(f"🔍 Looking for commits affecting 'requirements.txt'...")
        
        file_commits = await github_service.get_commits_affecting_file(
            repo_owner, repo_name, "requirements.txt", limit=10
        )
        
        if file_commits:
            print(f"✅ Found {len(file_commits)} commits affecting requirements.txt")
            
            for i, commit in enumerate(file_commits, 1):
                sha = commit.get('sha', 'N/A')
                message = commit.get('message', 'N/A')
                author = commit.get('author', {}).get('name', 'N/A')
                date = commit.get('timestamp', 'N/A')
                
                print(f"\n📝 Commit {i}:")
                print(f"   SHA: {sha[:8]}...")
                print(f"   Message: {message}")
                print(f"   Author: {author}")
                print(f"   Date: {date}")
                
                # Check if this might be the commit we're looking for
                if "bea69db2" in sha.lower() or "update requirements" in message.lower():
                    print(f"   🎯 This might be the commit you're looking for!")
                    
                    # Get detailed information
                    detailed_commit = await github_service.get_commit_by_sha(
                        repo_owner, repo_name, sha, include_files=True
                    )
                    
                    if detailed_commit:
                        await show_detailed_commit(detailed_commit)
                    else:
                        print(f"   ⚠️ Could not get detailed information")
        else:
            print(f"❌ No commits found affecting requirements.txt")
            
        # Method 2: Search by message
        print(f"\n🔍 Searching by commit message containing 'requirements'...")
        message_commits = await github_service.search_commits_by_message(
            repo_owner, repo_name, "requirements", limit=10
        )
        
        if message_commits:
            print(f"✅ Found {len(message_commits)} commits with 'requirements' in message")
            
            for i, commit in enumerate(message_commits, 1):
                sha = commit.get('sha', 'N/A')
                message = commit.get('message', 'N/A')
                
                if "bea69db2" in sha.lower():
                    print(f"🎯 FOUND YOUR COMMIT!")
                    detailed_commit = await github_service.get_commit_by_sha(
                        repo_owner, repo_name, sha, include_files=True
                    )
                    if detailed_commit:
                        await show_detailed_commit(detailed_commit)
                    break
                else:
                    print(f"   {i}. {sha[:8]}: {message[:60]}...")
        
        # Method 3: Get recent commits and scan
        print(f"\n🔍 Scanning recent commits...")
        recent_commits = await github_service.get_recent_commits(repo_owner, repo_name, limit=50)
        
        if recent_commits:
            target_found = False
            for commit in recent_commits:
                sha = commit.get('sha', '')
                message = commit.get('message', '')
                
                if ("bea69db2" in sha.lower() or 
                    ("update" in message.lower() and "requirements" in message.lower())):
                    
                    print(f"🎯 POTENTIAL MATCH FOUND!")
                    print(f"   SHA: {sha}")
                    print(f"   Message: {message}")
                    
                    # Get detailed version
                    detailed_commit = await github_service.get_commit_by_sha(
                        repo_owner, repo_name, sha, include_files=True
                    )
                    if detailed_commit:
                        await show_detailed_commit(detailed_commit)
                        target_found = True
                        break
            
            if not target_found:
                print(f"❌ Target commit not found in recent commits")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    await github_service.close()

async def show_detailed_commit(commit):
    """Show detailed commit information with file changes."""
    print(f"\n" + "="*60)
    print(f"📋 DETAILED COMMIT INFORMATION")
    print(f"="*60)
    
    sha = commit.get('sha', 'N/A')
    message = commit.get('message', 'N/A')
    author = commit.get('author', {})
    timestamp = commit.get('timestamp', 'N/A')
    url = commit.get('url', 'N/A')
    
    print(f"📅 SHA: {sha}")
    print(f"📝 Message: {message}")
    print(f"👤 Author: {author.get('name', 'N/A')} ({author.get('email', 'N/A')})")
    print(f"🕐 Date: {timestamp}")
    print(f"🔗 URL: {url}")
    
    # File changes
    files_changed = commit.get('files_changed', [])
    if files_changed:
        print(f"\n📂 FILES MODIFIED ({len(files_changed)} files):")
        print("-" * 60)
        
        for i, file_info in enumerate(files_changed, 1):
            filename = file_info.get('filename', 'N/A')
            status = file_info.get('status', 'N/A')
            additions = file_info.get('additions', 0)
            deletions = file_info.get('deletions', 0)
            changes = file_info.get('changes', 0)
            
            status_icon = {
                'added': '➕',
                'modified': '✏️',
                'deleted': '❌',
                'renamed': '📝'
            }.get(status, '📄')
            
            print(f"{i:2d}. {status_icon} {filename}")
            print(f"    Status: {status}")
            if additions > 0 or deletions > 0:
                print(f"    Changes: +{additions} additions, -{deletions} deletions")
            print()
    else:
        print(f"\n⚠️ No file change details available")
    
    # Stats
    stats = commit.get('stats', {})
    if stats:
        print(f"📊 STATISTICS:")
        print(f"   Total additions: {stats.get('additions', 0)}")
        print(f"   Total deletions: {stats.get('deletions', 0)}")
        print(f"   Total changes: {stats.get('total', 0)}")

if __name__ == "__main__":
    asyncio.run(find_requirements_commits())
