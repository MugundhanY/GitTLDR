#!/usr/bin/env python3
"""
Test script for first commit detection and analysis.
Validates that the enhanced commit analysis service can properly detect
and respond to "first commit" questions.
"""
import asyncio
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import CommitAnalysisService
from utils.logger import get_logger

logger = get_logger(__name__)


async def test_first_commit_detection():
    """Test the enhanced commit question detection for first commit questions."""
    
    commit_service = CommitAnalysisService()
    
    # Test cases for first commit questions
    first_commit_questions = [
        "What was the first commit?",
        "Show me the first commit",
        "What was the earliest commit?", 
        "What was the initial commit?",
        "When did this repository start?",
        "Show me the original commit",
        "What was the oldest commit?",
        "What were the first 3 commits?",
        "Show me the first few commits"
    ]
    
    # Test cases that should NOT be detected as first commit questions
    non_first_commit_questions = [
        "What was the last commit?",
        "Show me recent commits",
        "What changed in the latest commit?",
        "Who made the most commits?",
        "What files were modified?"
    ]
    
    print("🔍 Testing First Commit Question Detection")
    print("=" * 60)
    
    # Test positive cases
    print("\n✅ Testing POSITIVE cases (should detect as 'first' commit questions):")
    for question in first_commit_questions:
        is_commit_question, params = await commit_service.analyze_question(question)
        
        if is_commit_question and params and params.question_type == 'first':
            print(f"✅ PASS: '{question}' -> detected as '{params.question_type}' (limit: {params.limit})")
        else:
            print(f"❌ FAIL: '{question}' -> {params.question_type if params else 'not detected'}")
    
    # Test negative cases
    print("\n❌ Testing NEGATIVE cases (should NOT detect as 'first' commit questions):")
    for question in non_first_commit_questions:
        is_commit_question, params = await commit_service.analyze_question(question)
        
        if is_commit_question and params and params.question_type == 'first':
            print(f"❌ FAIL: '{question}' -> incorrectly detected as 'first' commit question")
        elif is_commit_question and params:
            print(f"✅ PASS: '{question}' -> correctly detected as '{params.question_type}' (not 'first')")
        else:
            print(f"✅ PASS: '{question}' -> correctly not detected as commit question")
    
    print("\n" + "=" * 60)
    print("🎯 First Commit Detection Test Complete!")


async def test_commit_patterns():
    """Test the regex patterns used for first commit detection."""
    
    commit_service = CommitAnalysisService()
    patterns = commit_service.question_patterns.get('first', [])
    
    print(f"\n🔍 Testing First Commit Regex Patterns ({len(patterns)} patterns)")
    print("=" * 60)
    
    import re
    
    test_phrases = [
        "first commit",
        "earliest commit", 
        "initial commit",
        "oldest commit",
        "what was the first commit",
        "show me the earliest commit",
        "when started",
        "original commit",
        "first 5 commits"
    ]
    
    for pattern in patterns:
        print(f"\nPattern: {pattern}")
        for phrase in test_phrases:
            match = re.search(pattern, phrase.lower(), re.IGNORECASE)
            status = "✅ MATCH" if match else "  no match"
            print(f"  {status}: '{phrase}'")


if __name__ == "__main__":
    print("🚀 Starting First Commit Detection Tests")
    
    asyncio.run(test_first_commit_detection())
    asyncio.run(test_commit_patterns())
    
    print("\n🎉 All tests completed!")
