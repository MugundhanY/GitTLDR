#!/usr/bin/env python3
"""
Simple test to create sample meeting data and test Q&A
"""
import requests
import json

def test_meeting_qa():
    """Test the meeting Q&A functionality."""
    base_url = "http://localhost:8001"
    
    print("🧪 Testing Meeting Q&A System...")
    
    # Test 1: Create sample meeting
    print("\n1. Creating sample meeting...")
    try:
        response = requests.post(f"{base_url}/test-meeting-qa", timeout=30)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sample meeting created: {data.get('meeting_id')}")
            
            # Show Q&A results
            qa_results = data.get('qa_results', [])
            print(f"\n📝 Q&A Results ({len(qa_results)} questions):")
            
            for i, result in enumerate(qa_results, 1):
                print(f"\nQ{i}: {result.get('question')}")
                answer = result.get('answer', 'No answer')
                confidence = result.get('confidence', 0)
                
                # Check if it's a fallback answer
                if "couldn't find relevant information" in answer.lower():
                    print(f"❌ Fallback answer (confidence: {confidence*100:.1f}%)")
                else:
                    print(f"✅ Good answer (confidence: {confidence*100:.1f}%)")
                    
                print(f"Answer: {answer[:200]}...")
                
        else:
            print(f"❌ Failed to create sample meeting: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    # Test 2: Test individual Q&A
    print("\n2. Testing individual Q&A...")
    try:
        qa_payload = {
            "meeting_id": "test-meeting-123",
            "question": "What is the project timeline and who is responsible?",
            "user_id": "test-user"
        }
        
        response = requests.post(f"{base_url}/meeting-qa", json=qa_payload, timeout=30)
        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            
            answer = result.get('answer', 'No answer')
            confidence = result.get('confidence', 0)
            status = result.get('status', 'unknown')
            
            print(f"Status: {status}")
            print(f"Confidence: {confidence*100:.1f}%")
            print(f"Answer: {answer}")
            
            if "couldn't find relevant information" in answer.lower():
                print("❌ Still getting fallback answer - Q&A needs debugging")
            else:
                print("✅ Q&A working correctly!")
                
        else:
            print(f"❌ Q&A failed: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    print("\n🎯 Testing complete!")

if __name__ == "__main__":
    test_meeting_qa()
