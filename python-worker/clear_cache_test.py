#!/usr/bin/env python3
"""
Clear Redis cache and test commit analysis fresh
"""
import asyncio

async def clear_cache_and_test():
    """Clear cache and test commit analysis fresh."""
    try:
        from services.redis_client import redis_client
        from services.commit_analysis_service import commit_analysis_service, CommitQueryParams
        
        print("=== CLEARING CACHE AND TESTING FRESH ===")
        
        # Connect and clear cache
        await redis_client.connect()
        await redis_client.redis.flushall()
        print("✅ Redis cache cleared")
        
        # Test fresh commit query
        repo_id = "cmc0s3wtg0007u9dg0panakse"  # fastapi-vosk
        params = CommitQueryParams(question_type='recent', limit=5)
        
        print(f"\n🔍 Testing fresh commit query...")
        commits = await commit_analysis_service.get_commits_for_question(repo_id, params)
        print(f"   Fresh result: {len(commits)} commits")
        
        if commits:
            print(f"   ✅ SUCCESS! Commit analysis now working!")
            for i, commit in enumerate(commits[:3]):
                print(f"      Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:50]}...")
                
            # Test context formatting
            context = commit_analysis_service.format_commits_for_context(commits, "what was the last commit?")
            print(f"   Context sections: {len(context)}")
            print(f"   Context preview: {context[0][:200]}...")
            
        else:
            print(f"   ❌ Still no commits - there's a deeper issue")
        
        await redis_client.disconnect()
        print(f"\n=== FRESH TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Fresh test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(clear_cache_and_test())
