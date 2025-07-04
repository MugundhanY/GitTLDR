import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from processors.meeting_summarizer import MeetingProcessor

async def test_action_items():
    try:
        meeting_id = 'meeting_1751621316328_tjlo7i2eq'
        print(f'Testing action items extraction for: {meeting_id}')
        
        # Create meeting processor
        meeting_processor = MeetingProcessor()
        
        # Extract action items
        result = await meeting_processor.extract_action_items(meeting_id)
        
        print(f"Status: {result.get('status')}")
        print(f"Action items count: {len(result.get('action_items', []))}")
        
        if result.get('action_items'):
            for i, item in enumerate(result['action_items'][:3], 1):
                print(f"Action Item {i}:")
                print(f"  Title: {item.get('title', 'No title')}")
                print(f"  Assignee: {item.get('assignee', 'No assignee')}")
                print(f"  Description: {item.get('description', 'No description')[:100]}...")
                print()
        
        if result.get('error'):
            print(f"Error: {result['error']}")
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_action_items())
