#!/usr/bin/env python3
"""
Debug script to test Q&A functionality and Qdrant integration
"""
import asyncio
import json
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.qdrant_client import qdrant_client
from services.database_service import database_service
from processors.meeting_summarizer import MeetingProcessor

async def debug_qa():
    """Debug Q&A functionality step by step"""
    print("🔍 Starting Q&A Debug Session...")
    
    # Test 1: Check Qdrant connection
    print("\n1. Testing Qdrant Connection...")
    try:
        status = await qdrant_client.get_collection_info()
        print(f"✅ Qdrant Status: {status}")
    except Exception as e:
        print(f"❌ Qdrant Connection Failed: {str(e)}")
        return
    
    # Test 2: List all meetings in database
    print("\n2. Checking Meetings in Database...")
    try:
        from services.database_service import DatabaseService
        db = DatabaseService()
        
        # Get all meetings
        meetings = await db.get_all_meetings()
        print(f"📊 Found {len(meetings)} meetings in database:")
        
        for meeting in meetings:
            print(f"  - {meeting.get('id')}: {meeting.get('title')} (Status: {meeting.get('status')})")
        
        if not meetings:
            print("❌ No meetings found in database!")
            return
            
        # Use the first meeting for testing
        test_meeting = meetings[0]
        meeting_id = test_meeting['id']
        print(f"\n🎯 Using meeting {meeting_id} for testing...")
        
    except Exception as e:
        print(f"❌ Database Query Failed: {str(e)}")
        return
    
    # Test 3: Check meeting segments in Qdrant
    print(f"\n3. Checking Meeting Segments in Qdrant for {meeting_id}...")
    try:
        # Try to search for all segments for this meeting with a dummy query
        dummy_embedding = [0.0] * 384  # Standard embedding dimension
        search_results = await qdrant_client.search_meeting_segments(
            query_embedding=dummy_embedding,
            meeting_id=meeting_id,
            limit=50,
            score_threshold=0.0  # Get all segments
        )
        
        print(f"📈 Found {len(search_results)} segments for meeting {meeting_id}")
        
        if search_results:
            for i, result in enumerate(search_results[:5]):  # Show first 5
                metadata = result.get('metadata', {})
                print(f"  Segment {i+1}:")
                print(f"    - Index: {metadata.get('segment_index', 'N/A')}")
                print(f"    - Title: {metadata.get('title', 'N/A')}")
                print(f"    - Score: {result.get('score', 'N/A')}")
                print(f"    - Text Length: {len(metadata.get('segment_text', ''))}")
        else:
            print("❌ No segments found in Qdrant for this meeting!")
            
            # Try to check if there are ANY vectors in Qdrant
            print("\n4. Checking if Qdrant has any vectors at all...")
            try:
                all_results = await qdrant_client.search_meeting_segments(
                    query_embedding=dummy_embedding,
                    meeting_id=None,  # Search all meetings
                    limit=10,
                    score_threshold=0.0
                )
                print(f"📊 Total vectors in Qdrant: {len(all_results)}")
                if all_results:
                    for result in all_results[:3]:
                        metadata = result.get('metadata', {})
                        print(f"  - Meeting: {metadata.get('meeting_id', 'N/A')}, Segment: {metadata.get('segment_index', 'N/A')}")
            except Exception as e:
                print(f"❌ Failed to search all vectors: {str(e)}")
            return
        
    except Exception as e:
        print(f"❌ Qdrant Search Failed: {str(e)}")
        return
    
    # Test 4: Test actual Q&A functionality
    print(f"\n5. Testing Q&A Functionality...")
    try:
        processor = MeetingProcessor()
        
        test_questions = [
            "What was discussed in this meeting?",
            "What are the main topics?",
            "Who was involved?",
            "What decisions were made?"
        ]
        
        for question in test_questions:
            print(f"\n❓ Question: {question}")
            
            result = await processor.answer_meeting_question(
                meeting_id=meeting_id,
                question=question,
                user_id="debug-user"
            )
            
            print(f"✅ Status: {result.get('status', 'unknown')}")
            print(f"📝 Answer: {result.get('answer', 'N/A')[:200]}...")
            print(f"🎯 Confidence: {result.get('confidence', 0)}")
            print(f"🔗 Related Segments: {len(result.get('related_segments', []))}")
            
            if result.get('status') == 'error':
                print(f"❌ Error: {result.get('error', 'Unknown error')}")
                break
                
    except Exception as e:
        print(f"❌ Q&A Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Test 5: Test action items extraction
    print(f"\n6. Testing Action Items Extraction...")
    try:
        processor = MeetingProcessor()
        
        result = await processor.extract_action_items(
            meeting_id=meeting_id,
            user_id="debug-user"
        )
        
        print(f"✅ Status: {result.get('status', 'unknown')}")
        action_items = result.get('action_items', [])
        print(f"📋 Action Items Found: {len(action_items)}")
        
        for i, item in enumerate(action_items[:3]):  # Show first 3
            print(f"  {i+1}. {item.get('title', 'N/A')}")
            print(f"     Assignee: {item.get('assignee', 'N/A')}")
            print(f"     Priority: {item.get('priority', 'N/A')}")
            
    except Exception as e:
        print(f"❌ Action Items Test Failed: {str(e)}")
    
    print("\n✅ Debug Session Complete!")

if __name__ == "__main__":
    asyncio.run(debug_qa())
