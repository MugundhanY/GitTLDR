import asyncio
from services.qdrant_client import qdrant_client

async def test_qdrant():
    try:
        await qdrant_client.connect()
        print('Qdrant connection successful')
        
        # Check if meeting collection exists
        collections = qdrant_client.client.get_collections()
        print(f'Collections: {[c.name for c in collections.collections]}')
        
        # Check for meeting segments
        meeting_collection = 'meeting_segments'
        if any(c.name == meeting_collection for c in collections.collections):
            print(f'Meeting collection {meeting_collection} exists')
            
            # Get collection info
            collection_info = qdrant_client.client.get_collection(meeting_collection)
            print(f'Points count: {collection_info.points_count}')
            
            # Try to search for a specific meeting
            dummy_embedding = [0.0] * 384
            search_results = await qdrant_client.search_meeting_segments(
                query_embedding=dummy_embedding,
                meeting_id='meeting_1751621316328_tjlo7i2eq',
                limit=10,
                score_threshold=0.0
            )
            print(f'Search results for meeting_1751621316328_tjlo7i2eq: {len(search_results)} segments')
            
        else:
            print(f'Meeting collection {meeting_collection} does not exist')
            
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_qdrant())
