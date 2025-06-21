#!/usr/bin/env python3
"""
Test repository info extraction for commit analysis
"""
import asyncio
import sys
import os

async def test_repository_info():
    """Test repository info extraction."""
    try:
        from services.commit_analysis_service import commit_analysis_service
        from services.database_service import database_service
        
        print("=== TESTING REPOSITORY INFO EXTRACTION ===")
        
        # Test with some dummy repository IDs to see what happens
        test_repo_ids = [
            "test_repo_123",
            "clv123456789",  # Typical CUID format
            "repo_456"
        ]
        
        for repo_id in test_repo_ids:
            print(f"\n🔍 Testing repository ID: {repo_id}")
            
            try:
                # Test database lookup
                repo_status = await database_service.get_repository_status(repo_id)
                print(f"   Database status: {repo_status}")
                
                if repo_status:
                    # Test GitHub info extraction
                    repo_owner, repo_name = await commit_analysis_service._get_repository_github_info(repo_id)
                    print(f"   GitHub info: {repo_owner}/{repo_name}")
                    
                    if repo_owner and repo_name:
                        print(f"   ✅ Successfully extracted GitHub repository info")
                        
                        # Test commit fetching
                        from services.commit_analysis_service import CommitQueryParams
                        params = CommitQueryParams(question_type='recent', limit=5)
                        
                        commits = await commit_analysis_service.get_commits_for_question(repo_id, params)
                        print(f"   Found {len(commits)} commits")
                        
                        if commits:
                            print(f"   ✅ Commit fetching working!")
                            for i, commit in enumerate(commits[:2]):
                                print(f"      Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:50]}...")
                        else:
                            print(f"   ⚠️ No commits found (could be empty repo or API issue)")
                    else:
                        print(f"   ❌ Could not extract GitHub repository info")
                else:
                    print(f"   ❌ Repository not found in database")
                    
            except Exception as e:
                print(f"   ❌ Error testing {repo_id}: {e}")
        
        # Test with actual repository data if we can find any
        print(f"\n🔍 Looking for actual repositories in database...")
        try:
            # This is a bit hacky, but let's see if we can find any repositories
            pool = await database_service._get_connection_pool()
            async with pool.acquire() as conn:
                repos = await conn.fetch("SELECT id, name, url FROM repositories LIMIT 3")
                
                if repos:
                    print(f"   Found {len(repos)} repositories in database")
                    
                    for repo in repos:
                        repo_id = repo['id']
                        repo_name = repo['name']
                        repo_url = repo['url']
                        
                        print(f"\n📁 Testing real repository: {repo_name}")
                        print(f"   ID: {repo_id}")
                        print(f"   URL: {repo_url}")
                        
                        # Test commit analysis on real repository
                        try:
                            repo_owner, repo_name_parsed = await commit_analysis_service._get_repository_github_info(repo_id)
                            print(f"   GitHub info: {repo_owner}/{repo_name_parsed}")
                            
                            if repo_owner and repo_name_parsed:
                                from services.commit_analysis_service import CommitQueryParams
                                params = CommitQueryParams(question_type='recent', limit=3)
                                
                                commits = await commit_analysis_service.get_commits_for_question(repo_id, params)
                                print(f"   Found {len(commits)} commits")
                                
                                if commits:
                                    print(f"   ✅ Real repository commit fetching working!")
                                    for i, commit in enumerate(commits[:1]):
                                        print(f"      Latest commit: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:30]}...")
                                else:
                                    print(f"   ⚠️ No commits found for real repository")
                            
                        except Exception as e:
                            print(f"   ❌ Error with real repository: {e}")
                            import traceback
                            traceback.print_exc()
                else:
                    print(f"   ❌ No repositories found in database")
                    
        except Exception as e:
            print(f"   ❌ Error querying database: {e}")
        
        print("\n=== REPOSITORY INFO TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Repository info test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_repository_info())
