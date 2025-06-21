#!/usr/bin/env python3
"""
Test the optimized commit Q&A with our improvements.
"""
import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.gemini_client import gemini_client


async def test_optimized_responses():
    """Test the optimized response handling."""
    print("🧪 Testing Optimized Commit Q&A Responses")
    print("=" * 60)
    
    # Test cases with different context sizes
    test_cases = [
        {
            "name": "Small Context",
            "context": "Repository: test\n" + "A" * 1000,
            "files": ["Small file content: " + "B" * 500]
        },
        {
            "name": "Medium Context", 
            "context": "Repository: test\n" + "A" * 3000,
            "files": ["Medium file content: " + "B" * 2000]
        },
        {
            "name": "Large Context",
            "context": "Repository: test\n" + "A" * 8000, 
            "files": ["Large file content: " + "B" * 5000]
        },
        {
            "name": "Very Large Context",
            "context": "Repository: test\n" + "A" * 15000,
            "files": ["Very large file content: " + "B" * 10000]
        }
    ]
    
    question = "What was the last commit?"
    
    for test_case in test_cases:
        print(f"\n🔍 Testing {test_case['name']}")
        
        context_size = len(test_case['context']) + sum(len(f) for f in test_case['files'])
        print(f"   Context size: {context_size} characters")
        
        try:
            result = await gemini_client.answer_question(
                question=question,
                context=test_case['context'],
                files_content=test_case['files']
            )
            
            if result:
                answer = result.get('answer', '')
                confidence = result.get('confidence', 0)
                
                print(f"   ✅ Response length: {len(answer)} characters")
                print(f"   ✅ Confidence: {confidence:.2f}")
                
                # Check for truncation indicators
                if '[Note:' in answer and 'truncated' in answer:
                    print(f"   ⚠️  Truncation notice added automatically")
                else:
                    print(f"   ✅ Response appears complete")
                
                # Show response preview
                preview = answer[:150] + "..." if len(answer) > 150 else answer
                print(f"   📄 Preview: {preview}")
            else:
                print(f"   ❌ No response received")
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    print(f"\n🎯 Test completed!")


if __name__ == "__main__":
    asyncio.run(test_optimized_responses())
