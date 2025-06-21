#!/usr/bin/env python3
"""
Deep investigation script to find commit bea69db2 in various ways.
This script will:
1. Check all branches for the commit
2. Try different variations of the SHA
3. Search commit messages for patterns
4. Check if it's a merge commit or special commit type
"""
import asyncio
import os
from services.github_commit_service import github_commit_service
from utils.logger import get_logger

logger = get_logger(__name__)

async def deep_investigate_commit():
    """Comprehensive investigation of commit bea69db2."""
    print("🔍 Deep investigation of commit bea69db2...")
    print("=" * 60)
    
    # Repository details
    owner = "MugundhanY"
    repo = "GitTLDR"
    commit_sha = "bea69db2"
    
    try:
        # 1. Get repository info first
        print("📊 Repository Information:")
        repo_info = await github_commit_service._make_github_request(f"repos/{owner}/{repo}")
        if repo_info:
            print(f"  - Name: {repo_info.get('name')}")
            print(f"  - Full name: {repo_info.get('full_name')}")
            print(f"  - Default branch: {repo_info.get('default_branch')}")
            print(f"  - Private: {repo_info.get('private')}")
            print(f"  - Clone URL: {repo_info.get('clone_url')}")
            print(f"  - Size: {repo_info.get('size')} KB")
            print(f"  - Created: {repo_info.get('created_at')}")
            print(f"  - Updated: {repo_info.get('updated_at')}")
            print(f"  - Pushed: {repo_info.get('pushed_at')}")
        else:
            print("  ❌ Could not retrieve repository information")
            return
        
        print("\n" + "=" * 60)
        
        # 2. List all branches
        print("🌳 Checking all branches:")
        branches_response = await github_commit_service._make_github_request(f"repos/{owner}/{repo}/branches")
        if branches_response:
            branches = [branch['name'] for branch in branches_response]
            print(f"  Found {len(branches)} branches: {', '.join(branches)}")
            
            # Check commit in each branch
            for branch in branches:
                print(f"\n  🔍 Checking branch '{branch}':")
                try:
                    # Try to get the commit specifically from this branch
                    commits_in_branch = await github_commit_service._make_github_request(
                        f"repos/{owner}/{repo}/commits",
                        params={"sha": branch, "per_page": 100}
                    )
                    
                    if commits_in_branch:
                        print(f"    - Found {len(commits_in_branch)} commits in branch")
                        
                        # Check if our commit SHA is in this branch
                        for commit in commits_in_branch:
                            commit_sha_full = commit.get('sha', '')
                            if commit_sha_full.startswith(commit_sha):
                                print(f"    ✅ FOUND! Commit {commit_sha} exists in branch '{branch}'")
                                print(f"       Full SHA: {commit_sha_full}")
                                print(f"       Message: {commit.get('commit', {}).get('message', 'No message')}")
                                print(f"       Author: {commit.get('commit', {}).get('author', {}).get('name', 'Unknown')}")
                                print(f"       Date: {commit.get('commit', {}).get('author', {}).get('date', 'Unknown')}")
                                
                                # Try to get full commit details with this full SHA
                                print(f"\n    🔍 Getting full commit details...")
                                full_commit = await github_commit_service.get_commit_details(owner, repo, commit_sha_full)
                                if full_commit:
                                    print(f"    ✅ Full commit details retrieved!")
                                    print(f"       Files changed: {len(full_commit.get('files', []))}")
                                    for file_change in full_commit.get('files', []):
                                        print(f"         - {file_change.get('filename')} ({file_change.get('status')})")
                                else:
                                    print(f"    ❌ Could not get full commit details")
                                return commit_sha_full
                        
                        print(f"    - Commit {commit_sha} not found in branch '{branch}'")
                    else:
                        print(f"    - Could not retrieve commits for branch '{branch}'")
                        
                except Exception as e:
                    print(f"    ❌ Error checking branch '{branch}': {str(e)}")
        else:
            print("  ❌ Could not retrieve branches")
        
        print("\n" + "=" * 60)
        
        # 3. Try different SHA variations
        print("🔍 Trying different SHA variations:")
        sha_variations = [
            "bea69db2",  # Original
            "bea69db",   # Shorter
            "bea69db25", # Slightly longer
            "bea69db2f", # Different ending
        ]
        
        for sha_variant in sha_variations:
            print(f"  Trying SHA: {sha_variant}")
            try:
                commit_details = await github_commit_service.get_commit_details(owner, repo, sha_variant)
                if commit_details:
                    print(f"    ✅ FOUND with SHA variant: {sha_variant}")
                    print(f"       Full SHA: {commit_details.get('sha')}")
                    print(f"       Message: {commit_details.get('commit', {}).get('message')}")
                    return sha_variant
                else:
                    print(f"    ❌ Not found with SHA: {sha_variant}")
            except Exception as e:
                print(f"    ❌ Error with SHA {sha_variant}: {str(e)}")
        
        print("\n" + "=" * 60)
        
        # 4. Search recent commits for any containing "bea69"
        print("🔍 Searching recent commits for patterns...")
        try:
            recent_commits = await github_commit_service._make_github_request(
                f"repos/{owner}/{repo}/commits",
                params={"per_page": 100}
            )
            
            if recent_commits:
                print(f"  Checking {len(recent_commits)} recent commits...")
                found_matches = []
                
                for commit in recent_commits:
                    commit_sha_full = commit.get('sha', '')
                    if 'bea69' in commit_sha_full.lower():
                        found_matches.append({
                            'sha': commit_sha_full,
                            'message': commit.get('commit', {}).get('message', ''),
                            'date': commit.get('commit', {}).get('author', {}).get('date', '')
                        })
                
                if found_matches:
                    print(f"  ✅ Found {len(found_matches)} commits containing 'bea69':")
                    for match in found_matches:
                        print(f"    - {match['sha'][:10]}... | {match['message'][:50]} | {match['date']}")
                else:
                    print("  ❌ No commits found containing 'bea69'")
                    
                # Also show the first few commits for reference
                print(f"\n  📋 First 5 commits in repository:")
                for i, commit in enumerate(recent_commits[:5]):
                    sha = commit.get('sha', '')
                    message = commit.get('commit', {}).get('message', '').split('\n')[0]
                    date = commit.get('commit', {}).get('author', {}).get('date', '')
                    print(f"    {i+1}. {sha[:10]}... | {message[:40]} | {date}")
                    
        except Exception as e:
            print(f"  ❌ Error searching recent commits: {str(e)}")
        
        print("\n" + "=" * 60)
        
        # 5. Check if there are any tags or releases
        print("🏷️ Checking tags and releases:")
        try:
            tags_response = await github_commit_service._make_github_request(f"repos/{owner}/{repo}/tags")
            if tags_response:
                print(f"  Found {len(tags_response)} tags:")
                for tag in tags_response[:10]:  # Show first 10 tags
                    tag_sha = tag.get('commit', {}).get('sha', '')
                    print(f"    - {tag.get('name')} -> {tag_sha[:10]}...")
                    if tag_sha.startswith(commit_sha):
                        print(f"      ✅ FOUND! Commit {commit_sha} is tagged as '{tag.get('name')}'")
            else:
                print("  No tags found")
                
            releases_response = await github_commit_service._make_github_request(f"repos/{owner}/{repo}/releases")
            if releases_response:
                print(f"  Found {len(releases_response)} releases:")
                for release in releases_response[:5]:  # Show first 5 releases
                    print(f"    - {release.get('tag_name')} ({release.get('name')})")
            else:
                print("  No releases found")
                
        except Exception as e:
            print(f"  ❌ Error checking tags/releases: {str(e)}")
        
        print("\n" + "=" * 60)
        print("❌ CONCLUSION: Commit bea69db2 was not found in any branch, tag, or recent history")
        print("💡 RECOMMENDATIONS:")
        print("   1. Double-check the commit SHA - it might have a typo")
        print("   2. Check if this commit is from a different repository or fork")
        print("   3. Verify if this commit was from a deleted branch or force-pushed over")
        print("   4. Check local git history if you have the repository cloned")
        print("   5. The commit might be in a different repository with a similar name")
        
    except Exception as e:
        logger.error(f"Error during deep investigation: {str(e)}")
        print(f"❌ Investigation failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(deep_investigate_commit())
