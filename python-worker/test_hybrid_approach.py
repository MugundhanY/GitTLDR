#!/usr/bin/env python3
"""
Test the hybrid commit approach step by step
"""
import asyncio

async def test_hybrid_approach():
    """Test the hybrid commit approach step by step."""
    try:
        from services.commit_analysis_service import commit_analysis_service
        from services.database_service import database_service
        from services.github_commit_service import github_commit_service
        
        print("=== TESTING HYBRID COMMIT APPROACH ===")
        
        # Test with real repository
        repo_id = "cmc0s3wtg0007u9dg0panakse"  # fastapi-vosk
        repo_owner = "MugundhanY"
        repo_name = "fastapi-vosk"
        limit = 5
        
        print(f"📁 Testing: {repo_owner}/{repo_name}")
        print(f"   Repository ID: {repo_id}")
        print(f"   Limit: {limit}")
        
        # Step 1: Test database commits
        print(f"\n🔍 Step 1: Testing database commits...")
        try:
            db_commits = await database_service.get_recent_commits(repo_id, limit=min(limit, 10))
            print(f"   Database result: {len(db_commits)} commits")
            
            if db_commits:
                print(f"   ✅ Database has commits")
                for i, commit in enumerate(db_commits[:2]):
                    print(f"      DB Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:30]}...")
            else:
                print(f"   ⚠️ Database has no commits")
                
        except Exception as e:
            print(f"   ❌ Database error: {e}")
            db_commits = []
        
        # Step 2: Test GitHub API directly
        print(f"\n🔍 Step 2: Testing GitHub API directly...")
        try:
            github_commits = await github_commit_service.get_recent_commits(repo_owner, repo_name, limit=limit)
            print(f"   GitHub API result: {len(github_commits)} commits")
            
            if github_commits:
                print(f"   ✅ GitHub API has commits")
                for i, commit in enumerate(github_commits[:2]):
                    print(f"      GitHub Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:30]}...")
            else:
                print(f"   ❌ GitHub API has no commits")
                
        except Exception as e:
            print(f"   ❌ GitHub API error: {e}")
            import traceback
            traceback.print_exc()
            github_commits = []
        
        # Step 3: Test hybrid method
        print(f"\n🔍 Step 3: Testing hybrid method...")
        try:
            hybrid_commits = await commit_analysis_service._get_recent_commits_hybrid(repo_id, repo_owner, repo_name, limit)
            print(f"   Hybrid result: {len(hybrid_commits)} commits")
            
            if hybrid_commits:
                print(f"   ✅ Hybrid method working")
                for i, commit in enumerate(hybrid_commits[:2]):
                    print(f"      Hybrid Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:30]}...")
            else:
                print(f"   ❌ Hybrid method returned no commits")
                
        except Exception as e:
            print(f"   ❌ Hybrid method error: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n=== HYBRID APPROACH TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Hybrid approach test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await github_commit_service.close()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_hybrid_approach())
