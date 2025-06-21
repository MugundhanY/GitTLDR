#!/usr/bin/env python3
"""
Demo script showing how to get detailed file modification information 
for any commit, including the format you'd see for your bea69db2 commit.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.github_commit_service import GitHubCommitService
from utils.logger import get_logger

logger = get_logger(__name__)

async def demo_file_modification_details():
    """Demo showing file modification details for commits."""
    
    print("📋 File Modification Details Demo")
    print("=" * 60)
    print("This shows the format and type of information available")
    print("for any commit, including your bea69db2 commit.")
    print()
    
    github_service = GitHubCommitService()
    
    try:
        # Demo with a known public repository commit
        print("🧪 Example: Getting file details from a requirements.txt update")
        print("Repository: microsoft/vscode")
        print("Looking for recent commits that modified requirements-like files...")
        
        # Get recent commits
        recent_commits = await github_service.get_recent_commits("microsoft", "vscode", limit=10)
        
        if recent_commits:
            print(f"\n✅ Found {len(recent_commits)} recent commits")
            
            # Look for a commit with file changes
            for i, commit in enumerate(recent_commits):
                commit_sha = commit.get('sha', '')
                commit_message = commit.get('message', '')
                files_changed = commit.get('files_changed', [])
                
                # Get detailed info for first commit with files
                if not files_changed and commit_sha:
                    # Try to get enhanced file details
                    enhanced_commit = await github_service.get_commit_by_sha(
                        "microsoft", "vscode", commit_sha, include_files=True
                    )
                    if enhanced_commit:
                        files_changed = enhanced_commit.get('files_changed', [])
                
                if files_changed:
                    print(f"\n📋 EXAMPLE FILE MODIFICATION DETAILS")
                    print(f"   (This is the format you'd see for your bea69db2 commit)")
                    print("-" * 50)
                    
                    print(f"📅 Commit SHA: {commit_sha[:8]}...")
                    print(f"📝 Message: {commit_message[:60]}...")
                    print(f"👤 Author: {commit.get('author', {}).get('name', 'N/A')}")
                    print(f"🕐 Date: {commit.get('timestamp', 'N/A')}")
                    
                    stats = commit.get('stats', {})
                    if stats:
                        print(f"\n📊 Statistics:")
                        print(f"   Total additions: +{stats.get('additions', 0)}")
                        print(f"   Total deletions: -{stats.get('deletions', 0)}")
                        print(f"   Total changes: {stats.get('total', 0)}")
                    
                    print(f"\n📂 Files Modified ({len(files_changed)} files):")
                    for j, file_info in enumerate(files_changed, 1):
                        filename = file_info.get('filename', 'N/A')
                        status = file_info.get('status', 'N/A')
                        additions = file_info.get('additions', 0)
                        deletions = file_info.get('deletions', 0)
                        changes = file_info.get('changes', 0)
                        
                        print(f"   {j:2d}. {filename}")
                        print(f"       Status: {status}")
                        print(f"       Changes: +{additions}/-{deletions} (total: {changes})")
                    
                    break
            
            print(f"\n" + "=" * 60)
            print("🎯 FOR YOUR COMMIT bea69db2:")
            print("Once you provide the correct repository path, you would see:")
            print()
            print("📅 Commit SHA: bea69db2")
            print("📝 Message: Update requirements.txt")
            print("👤 Author: Mugundhan Y")
            print("🕐 Date: 2024-10-17T19:13:32Z")
            print()
            print("📊 Statistics:")
            print("   Total additions: +X")
            print("   Total deletions: -Y") 
            print("   Total changes: Z")
            print()
            print("📂 Files Modified:")
            print("   1. requirements.txt")
            print("      Status: modified")
            print("      Changes: +X/-Y lines")
            print("   (potentially other files...)")
            
        else:
            print("❌ Could not retrieve commits for demo")
            
    except Exception as e:
        print(f"❌ Demo error: {str(e)}")
        
    finally:
        await github_service.close()

    print(f"\n💡 To get details for YOUR commit bea69db2:")
    print("   1. Confirm the exact repository (owner/name)")
    print("   2. Ensure you have access to the repository") 
    print("   3. Use the get_commit_by_sha() method")
    print("   4. The system will automatically extract:")
    print("      ✅ File names that were changed")
    print("      ✅ Type of change (added/modified/deleted)")
    print("      ✅ Number of lines added/removed")
    print("      ✅ Total change statistics")

if __name__ == "__main__":
    asyncio.run(demo_file_modification_details())
