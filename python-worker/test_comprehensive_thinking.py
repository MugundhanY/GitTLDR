#!/usr/bin/env python3
"""
Test script to verify comprehensive thinking endpoint with streaming and attachments.
"""
import asyncio
import json
from api.comprehensive_thinking import comprehensive_thinking_service

async def test_comprehensive_thinking():
    """Test comprehensive thinking with streaming."""
    
    print("🧠 Testing Comprehensive Thinking Service...")
    print("=" * 60)
    
    # Test with a repository that should exist
    repository_id = "cmc0s3wtg0007u9dg0panakse"  # Known test repository
    question = "What is the main purpose of this application and how does it work?"
    
    # Test attachments (empty for now, but structure is there)
    attachments = []
    
    try:
        print(f"📋 Question: {question}")
        print(f"🗂️  Repository: {repository_id}")
        print(f"📎 Attachments: {len(attachments)}")
        print("\n🔄 Starting thinking process...\n")
        
        step_count = 0
        
        # Get the streaming response
        response = await comprehensive_thinking_service.process_thinking_request(
            repository_id=repository_id,
            question=question,
            attachments=attachments,
            stream=True
        )
        
        # Process the stream
        async for chunk in response.body_iterator:
            if chunk:
                try:
                    # Parse each chunk as JSON
                    line = chunk.decode('utf-8').strip()
                    if line.startswith('data: '):
                        data = json.loads(line[6:])  # Remove 'data: ' prefix
                        
                        step_count += 1
                        step_type = data.get("type", "unknown")
                        content = data.get("content", "")
                        
                        print(f"[{step_count}] {step_type.upper()}: {content[:100]}{'...' if len(content) > 100 else ''}")
                        
                        if step_type == "complete":
                            break
                        elif step_type == "error":
                            print(f"❌ Error encountered: {content}")
                            break
                            
                except json.JSONDecodeError as e:
                    print(f"⚠️  JSON decode error: {e}")
                    continue
                except Exception as e:
                    print(f"⚠️  Processing error: {e}")
                    continue
        
        print(f"\n✅ Comprehensive thinking test completed!")
        print(f"📊 Total steps processed: {step_count}")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_comprehensive_thinking())
