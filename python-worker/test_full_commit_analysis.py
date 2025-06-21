#!/usr/bin/env python3
"""
Test the full commit analysis end-to-end
"""
import asyncio

async def test_full_commit_analysis():
    """Test the full commit analysis end-to-end."""
    try:
        from services.commit_analysis_service import commit_analysis_service, CommitQueryParams
        
        print("=== TESTING FULL COMMIT ANALYSIS ===")
        
        # Get a real repository ID
        from services.database_service import database_service
        pool = await database_service._get_connection_pool()
        async with pool.acquire() as conn:
            repo = await conn.fetchrow("SELECT id, name, url FROM repositories LIMIT 1")
            
            if not repo:
                print("❌ No repositories found in database")
                return
            
            repo_id = repo['id']
            repo_name = repo['name']
            repo_url = repo['url']
            
            print(f"📁 Testing with repository: {repo_name}")
            print(f"   ID: {repo_id}")
            print(f"   URL: {repo_url}")
            
            # Test commit question detection
            test_questions = [
                "what was the last commit?",
                "show me recent commits", 
                "what commits were made yesterday?",
                "who made the most recent commit?"
            ]
            
            for question in test_questions:
                print(f"\n🔍 Testing question: '{question}'")
                
                # Analyze question
                is_commit_question, commit_params = await commit_analysis_service.analyze_question(question)
                
                if is_commit_question and commit_params:
                    print(f"   ✅ Detected as {commit_params.question_type} commit question")
                    
                    # Test GitHub info extraction
                    owner, name = await commit_analysis_service._get_repository_github_info(repo_id)
                    print(f"   GitHub info: {owner}/{name}")
                    
                    if owner and name:
                        print(f"   ✅ GitHub info extraction working")
                        
                        # Test commit fetching
                        try:
                            commits = await commit_analysis_service.get_commits_for_question(repo_id, commit_params)
                            print(f"   Found {len(commits)} commits")
                            
                            if commits:
                                print(f"   ✅ Commit fetching working!")
                                
                                # Show first commit
                                first_commit = commits[0]
                                print(f"   Latest commit: {first_commit.get('sha', 'unknown')[:8]} - {first_commit.get('message', 'No message')[:50]}...")
                                
                                # Test context formatting
                                formatted_context = commit_analysis_service.format_commits_for_context(commits, question)
                                print(f"   Context size: {len(formatted_context)} sections")
                                print(f"   ✅ Context formatting working!")
                                
                            else:
                                print(f"   ⚠️ No commits found (could be empty repo)")
                                
                        except Exception as e:
                            print(f"   ❌ Commit fetching error: {e}")
                            
                    else:
                        print(f"   ❌ GitHub info extraction failed")
                else:
                    print(f"   ❌ Not detected as commit question")
        
        print(f"\n=== COMMIT ANALYSIS TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Full commit analysis test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_full_commit_analysis())
