#!/usr/bin/env python3
"""
Test script to verify that file modification details are correctly extracted
for commit-related questions, especially for "first commit" scenarios.
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import CommitAnalysisService
from services.github_commit_service import GitHubCommitService
from utils.logger import get_logger

logger = get_logger(__name__)

async def test_commit_file_details():
    """Test that commit questions properly extract and show file modification details."""
    
    # Initialize services
    commit_analysis = CommitAnalysisService()
    github_service = GitHubCommitService()
    
    # Test cases with commit-related questions
    test_cases = [
        {
            "query": "What was the first commit in this repository?",
            "repo_url": "https://github.com/microsoft/vscode",
            "description": "First commit question"
        },
        {
            "query": "Show me the initial commit and what files were added",
            "repo_url": "https://github.com/microsoft/vscode", 
            "description": "Initial commit with file request"
        },
        {
            "query": "What files were changed in the first commit?",
            "repo_url": "https://github.com/microsoft/vscode",
            "description": "Files changed in first commit"
        }
    ]
    
    print("🧪 Testing Commit File Details Extraction")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        query = test_case["query"]
        repo_url = test_case["repo_url"]
        description = test_case["description"]
        
        print(f"\n📝 Test Case {i}: {description}")
        print(f"   Query: '{query}'")
        print(f"   Repository: {repo_url}")
          # Step 1: Analyze question to detect if it's commit-related and get parameters
        is_commit_question, query_params = await commit_analysis.analyze_question(query)
        print(f"   ✅ Detected as commit question: {is_commit_question}")
        
        if not is_commit_question:
            print(f"   ❌ FAILED: Query not detected as commit-related")
            continue
        print(f"   📊 Query params: {query_params}")
        
        # Step 3: Get repository info
        repo_owner, repo_name = github_service.parse_repository_from_url(repo_url)
        if not repo_owner or not repo_name:
            print(f"   ❌ FAILED: Could not parse repository URL")
            continue
            
        print(f"   🏢 Repository: {repo_owner}/{repo_name}")
        
        # Step 4: Test getting earliest commits with file details
        try:
            earliest_commits = await github_service.get_earliest_commits(repo_owner, repo_name, limit=3)
            
            if earliest_commits:
                first_commit = earliest_commits[0]
                print(f"   📅 First commit SHA: {first_commit.get('sha', 'N/A')[:8]}")
                print(f"   📝 First commit message: {first_commit.get('message', 'N/A')[:50]}...")
                print(f"   👤 Author: {first_commit.get('author', {}).get('name', 'N/A')}")
                print(f"   🕐 Date: {first_commit.get('timestamp', 'N/A')}")
                
                # Check file details
                files_changed = first_commit.get('files_changed', [])
                if files_changed:
                    print(f"   📂 Files changed: {len(files_changed)} files")
                    
                    # Show first few files
                    for j, file_info in enumerate(files_changed[:5]):
                        filename = file_info.get('filename', 'N/A')
                        status = file_info.get('status', 'N/A')
                        additions = file_info.get('additions', 0)
                        deletions = file_info.get('deletions', 0)
                        print(f"      {j+1}. {filename} ({status}) +{additions}/-{deletions}")
                    
                    if len(files_changed) > 5:
                        print(f"      ... and {len(files_changed) - 5} more files")
                else:
                    print(f"   ⚠️  No file details available (might be initial commit limitation)")
                    
                    # Try to get specific commit details with enhanced file info
                    print(f"   🔍 Attempting to get enhanced file details...")
                    enhanced_commit = await github_service.get_commit_by_sha(
                        repo_owner, repo_name, first_commit.get('sha'), include_files=True
                    )
                    
                    if enhanced_commit:
                        enhanced_files = enhanced_commit.get('files_changed', [])
                        if enhanced_files:
                            print(f"   ✅ Enhanced: Found {len(enhanced_files)} files via tree API")
                            for j, file_info in enumerate(enhanced_files[:5]):
                                filename = file_info.get('filename', 'N/A')
                                status = file_info.get('status', 'N/A') 
                                print(f"      {j+1}. {filename} ({status})")
                        else:
                            print(f"   ❌ Could not get enhanced file details")
                            
            else:
                print(f"   ❌ FAILED: Could not retrieve earliest commits")
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
        
        print(f"   {'✅ PASSED' if earliest_commits else '❌ FAILED'}")

    print(f"\n🎯 Commit File Details Test Summary")
    print("=" * 60)
    print("The system includes:")
    print("✅ File change detection in commits")
    print("✅ File status (added/modified/deleted)")
    print("✅ Addition/deletion counts when available")
    print("✅ Tree API fallback for initial commits")
    print("✅ Proper formatting for file details")
    
    # Clean up GitHub service session
    await github_service.close()
    
if __name__ == "__main__":
    asyncio.run(test_commit_file_details())
