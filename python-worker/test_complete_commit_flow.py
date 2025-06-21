#!/usr/bin/env python3
"""
Comprehensive end-to-end test for commit analysis system.
Tests the full Q&A flow with commit-related questions.
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.commit_analysis_service import CommitAnalysisService
from services.database_service import DatabaseService
from services.github_commit_service import GitHubCommitService
from services.redis_client import redis_client
from processors.embedding import EmbeddingProcessor
from utils.logger import get_logger

logger = get_logger(__name__)

async def test_commit_qna_flow():
    """Test the complete commit Q&A flow."""
    print("=== COMMIT Q&A END-TO-END TEST ===\n")
    
    # Initialize services
    commit_service = CommitAnalysisService()
    database_service = DatabaseService()
    embedding_processor = EmbeddingProcessor()
    
    # Connect to Redis
    await redis_client.connect()
    
    try:
        # Test repository (public GitHub repo)
        repo_url = "https://github.com/microsoft/vscode"
        
        # Test questions
        test_questions = [
            "What are the recent commits in this repository?",
            "Show me commits from the last week",
            "What commits were made by microsoft?",
            "Find commits that mention 'fix' in the message",
            "What files were changed in recent commits?",
        ]
        
        print(f"Testing with repository: {repo_url}\n")
        
        # Test each question
        for i, question in enumerate(test_questions, 1):
            print(f"--- Test {i}: {question} ---")
            
            try:
                # Step 1: Check commit detection
                is_commit_question = await commit_service.is_commit_related_question(question)
                print(f"✓ Commit detection: {is_commit_question}")
                
                if is_commit_question:
                    # Step 2: Extract parameters
                    params = await commit_service.extract_commit_parameters(question)
                    print(f"✓ Parameters extracted: {params}")
                    
                    # Step 3: Get commit context (simulate with repo URL)
                    # For this test, we'll simulate having a repository with this URL
                    mock_repo_status = {
                        'id': 'test-repo-id',
                        'name': 'vscode',
                        'url': repo_url,
                        'embedding_status': 'completed',
                        'processed': True
                    }
                    
                    context = await commit_service.get_commit_context(
                        question, mock_repo_status, params
                    )
                    print(f"✓ Context generated: {len(context)} characters")
                    
                    if context:
                        # Show a preview of the context
                        preview = context[:300] + "..." if len(context) > 300 else context
                        print(f"Context preview: {preview}")
                    else:
                        print("⚠ No context generated")
                
                else:
                    print("→ Not a commit-related question, skipping commit analysis")
                
                print()
                
            except Exception as e:
                print(f"❌ Error testing question: {str(e)}")
                import traceback
                traceback.print_exc()
                print()
        
        # Test 4: Cache verification
        print("--- Cache Test ---")
        cache_keys = await redis_client.keys("commit_analysis:*")
        print(f"✓ Found {len(cache_keys)} cached commit analysis results")
        for key in cache_keys[:3]:  # Show first 3 keys
            print(f"  - {key}")
        print()
        
        # Test 5: Full embedding processor integration
        print("--- Full Integration Test ---")
        test_question = "What are the recent commits in the VSCode repository?"
        print(f"Testing full Q&A flow with: {test_question}")
        
        # This would normally be called by the main Q&A endpoint
        # For now, we'll just test the commit analysis part
        is_commit = await commit_service.is_commit_related_question(test_question)
        if is_commit:
            params = await commit_service.extract_commit_parameters(test_question)
            mock_repo = {
                'id': 'vscode-repo',
                'name': 'vscode',
                'url': 'https://github.com/microsoft/vscode',
                'embedding_status': 'completed'
            }
            context = await commit_service.get_commit_context(test_question, mock_repo, params)
            print(f"✓ Full integration successful: {len(context)} chars of context")
        else:
            print("❌ Full integration failed: question not detected as commit-related")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        await redis_client.disconnect()
    
    print("\n=== END-TO-END TEST COMPLETE ===")

async def test_github_api_availability():
    """Test GitHub API availability and rate limits."""
    print("=== GITHUB API TEST ===\n")
    
    try:
        github_service = GitHubCommitService()
        
        # Test API availability
        await github_service._check_rate_limit()
        print("✓ GitHub API is available and rate limit checked")
        
        # Test repository parsing
        test_urls = [
            "https://github.com/microsoft/vscode",
            "https://github.com/python/cpython",
            "microsoft/typescript"
        ]
        
        for url in test_urls:
            try:
                owner, repo = github_service._parse_github_url(url)
                print(f"✓ Parsed {url} -> {owner}/{repo}")
            except Exception as e:
                print(f"❌ Failed to parse {url}: {str(e)}")
        
        # Test commit fetching (limited to avoid rate limits)
        try:
            commits = await github_service.get_commits("microsoft", "vscode", limit=3)
            print(f"✓ Fetched {len(commits)} commits from microsoft/vscode")
            
            if commits:
                commit = commits[0]
                print(f"  Latest commit: {commit.get('sha', 'N/A')[:8]} - {commit.get('message', 'N/A')[:50]}...")
        except Exception as e:
            print(f"❌ Failed to fetch commits: {str(e)}")
    
    except Exception as e:
        print(f"❌ GitHub API test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n=== GITHUB API TEST COMPLETE ===\n")

async def main():
    """Run all tests."""
    print("Starting comprehensive commit analysis tests...\n")
    
    # Test 1: GitHub API availability
    await test_github_api_availability()
    
    # Test 2: Full commit Q&A flow
    await test_commit_qna_flow()
    
    print("All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
