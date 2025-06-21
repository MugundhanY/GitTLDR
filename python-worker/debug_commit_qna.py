#!/usr/bin/env python3
"""
Debug script for testing commit-related Q&A functionality.
Run this to test if your commit analysis is working correctly.
"""
import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import commit_analysis_service
from services.github_commit_service import github_commit_service
from services.database_service import database_service


async def test_commit_analysis():
    """Test commit analysis for debugging."""
    print("🔍 Testing Commit Analysis Service...")
    
    # Test questions
    test_questions = [
        "What was the last commit?",
        "Show me recent commits",
        "What are the latest commits?",
        "Who made the most recent commit?",
        "What changed in the last commit?"
    ]
    
    for question in test_questions:
        print(f"\n📝 Testing question: '{question}'")
        
        # Analyze question
        is_commit_question, params = await commit_analysis_service.analyze_question(question)
        
        if is_commit_question:
            print(f"✅ Detected as {params.question_type} commit question")
            print(f"   Parameters: {params}")
        else:
            print("❌ Not detected as commit question")


async def test_github_service():
    """Test GitHub service connectivity."""
    print("\n🔗 Testing GitHub Service...")
    
    try:
        # Test with a public repository
        repo_owner = "octocat"
        repo_name = "Hello-World"
        
        print(f"Testing with {repo_owner}/{repo_name}...")
        
        # Get repository info
        repo_info = await github_commit_service.get_repository_info(repo_owner, repo_name)
        if repo_info:
            print(f"✅ Repository found: {repo_info.get('name')} - {repo_info.get('description')}")
        else:
            print("❌ Failed to get repository info")
        
        # Get recent commits
        commits = await github_commit_service.get_recent_commits(repo_owner, repo_name, limit=3)
        if commits:
            print(f"✅ Found {len(commits)} commits")
            for i, commit in enumerate(commits[:2], 1):
                print(f"   {i}. {commit.get('sha', '')[:8]} - {commit.get('message', '')[:50]}...")
        else:
            print("❌ No commits found")
            
    except Exception as e:
        print(f"❌ Error testing GitHub service: {e}")
    
    finally:
        # Clean up
        await github_commit_service.close()


async def test_database_connection():
    """Test database connectivity."""
    print("\n💾 Testing Database Connection...")
    
    try:
        # Test basic database connection with a simple query
        pool = await database_service._get_connection_pool()
        if pool:
            print("✅ Database connection pool created successfully")
            
            # Try to get repository status for a test case
            # This will test if the basic database query works
            try:
                repo_status = await database_service.get_repository_status("test-repo-id")
                print("✅ Database query executed successfully (no repo found, but connection works)")
            except Exception as query_error:
                print(f"⚠️ Database connected but query failed: {query_error}")
        else:
            print("❌ Failed to create database connection pool")
            
    except Exception as e:
        print(f"❌ Database connection error: {e}")


async def main():
    """Main debug function."""
    print("🚀 GitTLDR Commit Q&A Debug Tool")
    print("=" * 50)
    
    await test_commit_analysis()
    await test_github_service()
    await test_database_connection()
    
    print("\n" + "=" * 50)
    print("🎯 Debug Summary:")
    print("1. If commit detection works but no commits found → Check GitHub token")
    print("2. If GitHub service fails → Check internet connection and token")
    print("3. If database fails → Check database connection settings")
    print("4. If all pass but Q&A still doesn't work → Check Gemini API key")


if __name__ == "__main__":
    asyncio.run(main())
