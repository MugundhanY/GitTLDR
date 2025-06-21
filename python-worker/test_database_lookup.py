#!/usr/bin/env python3
"""
Test database repository status lookup
"""
import asyncio

async def test_database_lookup():
    """Test database repository status lookup."""
    try:
        from services.database_service import database_service
        
        print("=== TESTING DATABASE REPOSITORY LOOKUP ===")
        
        # Get actual repository IDs from database
        pool = await database_service._get_connection_pool()
        async with pool.acquire() as conn:
            repos = await conn.fetch("SELECT id, name, url FROM repositories LIMIT 3")
            
            for repo in repos:
                repo_id = repo['id']
                repo_name = repo['name']
                repo_url = repo['url']
                
                print(f"\n📁 Testing repository: {repo_name}")
                print(f"   ID: {repo_id}")
                print(f"   URL: {repo_url}")
                
                # Test database service method
                try:
                    repo_status = await database_service.get_repository_status(repo_id)
                    print(f"   Status result: {repo_status}")
                    print(f"   Status type: {type(repo_status)}")
                    
                    if repo_status:
                        print(f"   Status keys: {repo_status.keys() if hasattr(repo_status, 'keys') else 'No keys'}")
                        
                        name_from_status = repo_status.get('name', 'NOT_FOUND')
                        url_from_status = repo_status.get('url', 'NOT_FOUND')
                        
                        print(f"   Name from status: '{name_from_status}'")
                        print(f"   URL from status: '{url_from_status}'")
                        
                        # Test GitHub parsing directly
                        if url_from_status and url_from_status != 'NOT_FOUND':
                            from services.github_commit_service import github_commit_service
                            
                            print(f"   Testing URL parsing on: {url_from_status}")
                            owner, name = github_commit_service.parse_repository_from_url(url_from_status)
                            print(f"   Parse result: {owner}/{name}")
                            
                    else:
                        print(f"   ❌ get_repository_status returned None")
                        
                except Exception as e:
                    print(f"   ❌ Error in get_repository_status: {e}")
                    import traceback
                    traceback.print_exc()
        
        print("\n=== DATABASE LOOKUP TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Database lookup test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_database_lookup())
