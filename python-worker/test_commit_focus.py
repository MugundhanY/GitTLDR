#!/usr/bin/env python3
"""
Test commit-focused Q&A to ensure it doesn't analyze repository files unnecessarily.
"""
import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.gemini_client import gemini_client


async def test_commit_focused_qa():
    """Test that commit questions focus on commits, not repository files."""
    print("🧪 Testing Commit-Focused Q&A")
    print("=" * 60)
    
    # Test case: commit question with large repository files (should ignore files)
    commit_context = """Repository: test-repo
GitHub URL: https://github.com/user/test-repo

🔄 COMMIT ANALYSIS RESULTS:
- Found 1 relevant commits
- Query type: recent
- Use the commit data below to answer the user's question"""
    
    # Large repository file content that should be ignored
    large_file_content = """File 1:
main.py:
""" + "A" * 10000 + """
This is a very large Python file with lots of code that should not be analyzed
when user asks about commits."""
    
    # Actual commit data (this should be the focus)
    commit_data = """============================================================
🔄 COMMIT ANALYSIS
============================================================
Found 1 relevant commits for question: What was the last commit?

COMMIT 1: abc123ef
Message: Fix authentication bug in login system
Author: John Doe <john@example.com>
Date: 2025-06-21T01:00:00Z
Files Changed: 3
GitHub URL: https://github.com/user/test-repo/commit/abc123ef
========================================"""
    
    files_content = [large_file_content, commit_data]
    
    print("🔍 Testing commit question with large repository context")
    print(f"   Repository file size: {len(large_file_content)} characters")
    print(f"   Commit data size: {len(commit_data)} characters")
    
    try:
        result = await gemini_client.answer_question(
            question="What was the last commit?",
            context=commit_context,
            files_content=files_content
        )
        
        if result:
            answer = result.get('answer', '')
            confidence = result.get('confidence', 0)
            
            print(f"   ✅ Response length: {len(answer)} characters")
            print(f"   ✅ Confidence: {confidence:.2f}")
            
            # Check if response focuses on commit data
            commit_indicators = [
                'abc123ef',  # Commit SHA
                'Fix authentication bug',  # Commit message
                'John Doe',  # Author
                '2025-06-21'  # Date
            ]
            
            found_indicators = [indicator for indicator in commit_indicators if indicator in answer]
            print(f"   📊 Commit details found: {len(found_indicators)}/4")
            
            # Check for unwanted repository analysis
            analysis_indicators = [
                'architecture',
                'design patterns',
                'file structure',
                'implementation details',
                'overall functionality'
            ]
            
            found_analysis = [indicator for indicator in analysis_indicators if indicator.lower() in answer.lower()]
            
            if len(found_indicators) >= 3:
                print(f"   ✅ Response focuses on commit data")
            else:
                print(f"   ⚠️  Response may not be commit-focused enough")
            
            if len(found_analysis) <= 1:
                print(f"   ✅ Response avoids unnecessary code analysis")
            else:
                print(f"   ⚠️  Response includes too much code analysis: {found_analysis}")
            
            print(f"\n📄 Response:")
            print("=" * 40)
            print(answer)
            print("=" * 40)
        else:
            print(f"   ❌ No response received")
    
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    print(f"\n🎯 Test completed!")


if __name__ == "__main__":
    asyncio.run(test_commit_focused_qa())
