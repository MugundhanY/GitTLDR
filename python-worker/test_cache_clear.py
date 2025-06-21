#!/usr/bin/env python3
"""
Test commit analysis with cache clearing
"""
import asyncio

async def test_with_cache_clear():
    """Test commit analysis with cache clearing."""
    try:
        from services.commit_analysis_service import commit_analysis_service, CommitQueryParams
        from services.redis_client import redis_client
        
        print("=== TESTING WITH CACHE CLEAR ===")
        
        # Clear all commit cache
        try:
            await redis_client.connect()
            keys = await redis_client.keys("commit_query:*")
            print(f"Found {len(keys)} cached commit queries")
            
            if keys:
                for key in keys:
                    await redis_client.redis.delete(key)
                print(f"Cleared {len(keys)} cache entries")
            else:
                print("No cache entries to clear")
                
        except Exception as e:
            print(f"Cache clear error: {e}")
        
        # Test with real repository
        repo_id = "cmc0s3wtg0007u9dg0panakse"  # fastapi-vosk
        
        print(f"\n📁 Testing fresh commit query...")
        
        # Create a recent commits query
        params = CommitQueryParams(question_type='recent', limit=5)
        
        # Test the query
        commits = await commit_analysis_service.get_commits_for_question(repo_id, params)
        print(f"   Result: {len(commits)} commits")
        
        if commits:
            print(f"   ✅ Success! Found commits:")
            for i, commit in enumerate(commits[:3]):
                print(f"      Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:50]}...")
        else:
            print(f"   ❌ Still no commits found")
            
            # Let's test the GitHub service directly within the commit analysis context
            print(f"\n🔍 Testing GitHub service directly...")
            
            # Get repository info
            repo_owner, repo_name = await commit_analysis_service._get_repository_github_info(repo_id)
            print(f"   Repository: {repo_owner}/{repo_name}")
            
            if repo_owner and repo_name:
                from services.github_commit_service import github_commit_service
                
                direct_commits = await github_commit_service.get_recent_commits(repo_owner, repo_name, limit=5)
                print(f"   Direct GitHub result: {len(direct_commits)} commits")
                
                if direct_commits:
                    print(f"   ✅ GitHub service working directly")
                    for i, commit in enumerate(direct_commits[:2]):
                        print(f"      Direct Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:50]}...")
                else:
                    print(f"   ❌ Even direct GitHub service returns no commits")
        
        print(f"\n=== CACHE CLEAR TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Cache clear test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_with_cache_clear())
