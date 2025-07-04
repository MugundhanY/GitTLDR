import asyncio
from services.database_service import database_service

async def test_meeting_data():
    try:
        meeting_id = 'meeting_1751621316328_tjlo7i2eq'
        print(f'Testing meeting data for: {meeting_id}')
        
        # Get meeting info from database
        meeting_info = await database_service.get_meeting_info(meeting_id)
        
        if meeting_info:
            print(f"Meeting title: {meeting_info.get('title', 'Unknown')}")
            print(f"Meeting duration: {meeting_info.get('duration', 'Unknown')}")
            print(f"Has transcript: {'full_transcript' in meeting_info}")
            print(f"Has segments: {'segments' in meeting_info}")
            
            if 'segments' in meeting_info:
                segments = meeting_info['segments']
                print(f"Number of segments: {len(segments)}")
                
                # Show first few segments
                for i, segment in enumerate(segments[:3]):
                    print(f"Segment {i}: {segment.get('title', 'No title')} - {segment.get('summary', 'No summary')[:100]}...")
                    
        else:
            print(f"Meeting {meeting_id} not found in database")
            
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_meeting_data())
