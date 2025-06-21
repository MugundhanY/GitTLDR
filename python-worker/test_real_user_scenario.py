#!/usr/bin/env python3
"""
Test script to simulate real user scenarios that might cause truncation.
Tests edge cases and potential issues.
"""
import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import commit_analysis_service
from services.github_commit_service import github_commit_service
from services.gemini_client import gemini_client
from processors.embedding import EmbeddingProcessor


async def test_edge_cases():
    """Test edge cases that might cause truncation."""
    print("🧪 Testing Edge Cases for Commit Q&A...")
    print("=" * 60)
    
    # Test 1: Large repository with many commits
    print("\n🔍 Test 1: Large number of commits")
    try:
        commits = await github_commit_service.get_recent_commits("torvalds", "linux", limit=50)
        if commits:
            print(f"✅ Fetched {len(commits)} commits from large repository")
            
            # Test formatting large commit data
            formatted = commit_analysis_service.format_commits_for_context(commits[:10], "What was the last commit?")
            total_chars = sum(len(section) for section in formatted)
            print(f"   Context size: {total_chars} characters")
            
            if total_chars > 10000:
                print("⚠️  Large context size might cause issues")
        else:
            print("❌ Could not fetch commits from large repository")
    except Exception as e:
        print(f"❌ Error testing large repository: {e}")
    
    # Test 2: Repository with very long commit messages
    print("\n🔍 Test 2: Long commit messages")
    try:
        # Try a repository known for detailed commit messages
        commits = await github_commit_service.get_recent_commits("facebook", "react", limit=5)
        if commits:
            max_message_length = max(len(commit.get('message', '')) for commit in commits)
            print(f"✅ Max commit message length: {max_message_length} characters")
            
            if max_message_length > 500:
                print("⚠️  Very long commit messages detected")
        else:
            print("❌ Could not fetch commits")
    except Exception as e:
        print(f"❌ Error testing long messages: {e}")
    
    # Test 3: Multiple question types that might cause different responses
    print("\n🔍 Test 3: Different question types")
    test_questions = [
        "What was the last commit and what files did it change?",
        "Give me a detailed analysis of the most recent 5 commits",
        "What are all the recent commits by the main author with full details?",
        "Show me the commit history with file changes and diff information"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n   Question {i}: {question}")
        is_commit, params = await commit_analysis_service.analyze_question(question)
        if is_commit:
            print(f"   ✅ Detected as {params.question_type} commit question")
        else:
            print("   ❌ Not detected as commit question")


async def test_gemini_limits():
    """Test Gemini's response limits with different context sizes."""
    print("\n🧪 Testing Gemini Response Limits...")
    print("=" * 60)
    
    # Create progressively larger contexts
    test_contexts = [
        ("Small", "Repository: test\n" + "File content: " + "A" * 1000),
        ("Medium", "Repository: test\n" + "File content: " + "B" * 5000),
        ("Large", "Repository: test\n" + "File content: " + "C" * 10000),
        ("Very Large", "Repository: test\n" + "File content: " + "D" * 20000),
    ]
    
    for size_name, context in test_contexts:
        print(f"\n🔍 Testing {size_name} context ({len(context)} characters)")
        
        try:
            result = await gemini_client.answer_question(
                question="What does this code do?",
                context=context,
                files_content=[context]
            )
            
            answer_length = len(result["answer"])
            print(f"   ✅ Response length: {answer_length} characters")
            print(f"   ✅ Confidence: {result['confidence']}")
            
            # Check for truncation indicators
            answer = result["answer"]
            if answer_length >= 3800:
                print("   ⚠️  Response near max token limit")
            if not answer.endswith(('.', '!', '?', '```')):
                print("   ⚠️  Response might be truncated (no proper ending)")
            if "[Note: Response may have been truncated" in answer:
                print("   ⚠️  Explicit truncation warning detected")
                
        except Exception as e:
            print(f"   ❌ Error with {size_name} context: {e}")


async def test_commit_plus_files():
    """Test commit data combined with file content (real scenario)."""
    print("\n🧪 Testing Commit + File Content (Real Scenario)...")
    print("=" * 60)
    
    try:
        # Get some commits
        commits = await github_commit_service.get_recent_commits("octocat", "Hello-World", limit=3)
        commit_context = commit_analysis_service.format_commits_for_context(commits, "What was the last commit?")
        
        # Simulate some file content
        mock_files = [
            "README.md:\n# Hello World\nThis is a test repository\n" + "Content " * 100,
            "package.json:\n" + '{"name": "test", "version": "1.0.0"}' + "\n" + "Dependencies " * 50,
            "main.js:\n" + "console.log('Hello World');\n" + "// Code comments " * 75
        ]
        
        # Combine commit context with file content
        all_content = commit_context + mock_files
        
        total_context_size = sum(len(content) for content in all_content)
        print(f"📊 Total context size: {total_context_size} characters")
        print(f"   - Commit context: {len(commit_context)} sections")
        print(f"   - File content: {len(mock_files)} files")
        
        # Test with Gemini
        repo_info = """Repository: Hello-World
GitHub URL: https://github.com/octocat/Hello-World
🔄 COMMIT ANALYSIS RESULTS:
- Found 3 relevant commits
- Query type: recent
- Use the commit data below to answer the user's question"""
        
        result = await gemini_client.answer_question(
            question="What was the last commit and how does it relate to the code?",
            context=repo_info,
            files_content=all_content
        )
        
        answer_length = len(result["answer"])
        print(f"\n✅ Combined test successful")
        print(f"   Response length: {answer_length} characters")
        print(f"   Confidence: {result['confidence']}")
        
        # Show a preview of the answer
        preview = result["answer"][:300] + "..." if len(result["answer"]) > 300 else result["answer"]
        print(f"\n📄 Answer preview:\n{preview}")
        
    except Exception as e:
        print(f"❌ Error in combined test: {e}")


async def main():
    """Run all edge case tests."""
    print("🚀 Real User Scenario Testing")
    print("=" * 60)
    print("Testing conditions that might cause truncation or issues...")
    
    await test_edge_cases()
    await test_gemini_limits()
    await test_commit_plus_files()
    
    # Cleanup
    await github_commit_service.close()
    
    print("\n" + "=" * 60)
    print("🎯 Edge Case Test Summary:")
    print("✅ If all tests pass → System is robust")
    print("⚠️  If truncation warnings → Need to optimize context size")
    print("❌ If errors occur → Check specific error messages")
    print("\n💡 Solutions for truncation:")
    print("1. Increase max_output_tokens in Gemini config")
    print("2. Implement context chunking for large repositories")
    print("3. Add commit summarization for very active repositories")
    print("4. Use streaming responses for long answers")


if __name__ == "__main__":
    asyncio.run(main())
