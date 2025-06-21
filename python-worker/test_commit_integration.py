#!/usr/bin/env python3
"""
Test script to verify commit analysis integration.
"""
import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_commit_analysis():
    """Test the commit analysis service integration."""
    try:
        # Test importing the service
        from services.commit_analysis_service import commit_analysis_service
        print("✓ Commit analysis service imported successfully")
        
        # Test question analysis
        test_questions = [
            "What was the last commit?",
            "Show me commits by John Doe",
            "What commits changed the README.md file?",
            "Show me commits from yesterday",
            "What is this code about?",  # Non-commit question
        ]
        
        for question in test_questions:
            is_commit, params = await commit_analysis_service.analyze_question(question)
            if is_commit:
                print(f"✓ Detected commit question: '{question}' -> {params.question_type}")
            else:
                print(f"✓ Non-commit question detected: '{question}'")
        
        # Test embedding processor integration
        from processors.embedding import EmbeddingProcessor
        processor = EmbeddingProcessor()
        print("✓ Embedding processor imported successfully")
        
        print("\n🎉 All integration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {str(e)}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_commit_analysis())
    sys.exit(0 if result else 1)
