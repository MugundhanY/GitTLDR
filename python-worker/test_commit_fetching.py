#!/usr/bin/env python3
"""
Test commit fetching with a known public repository
"""
import asyncio

async def test_commit_fetching():
    """Test commit fetching with known repositories."""
    try:
        from services.github_commit_service import github_commit_service
        
        print("=== TESTING COMMIT FETCHING ===")
        
        # Test with a known public repository that definitely has commits
        test_repos = [
            ("microsoft", "vscode"),
            ("MugundhanY", "fastapi-vosk"),  # User's repo
            ("facebook", "react")
        ]
        
        for owner, repo in test_repos:
            print(f"\n📁 Testing repository: {owner}/{repo}")
            
            try:
                # Test recent commits
                commits = await github_commit_service.get_recent_commits(owner, repo, limit=3)
                print(f"   Found {len(commits)} recent commits")
                
                if commits:
                    print(f"   ✅ Recent commits working!")
                    for i, commit in enumerate(commits):
                        print(f"      Commit {i+1}: {commit.get('sha', 'unknown')[:8]} - {commit.get('message', 'No message')[:50]}...")
                else:
                    print(f"   ❌ No recent commits found")
                
                # Test commit by SHA (if we found some)
                if commits:
                    test_sha = commits[0].get('sha')
                    if test_sha:
                        print(f"   Testing commit by SHA: {test_sha[:8]}...")
                        single_commit = await github_commit_service.get_commit_by_sha(owner, repo, test_sha)
                        if single_commit:
                            print(f"   ✅ Commit by SHA working!")
                        else:
                            print(f"   ❌ Commit by SHA failed")
                
            except Exception as e:
                print(f"   ❌ Error testing {owner}/{repo}: {e}")
                import traceback
                traceback.print_exc()
        
        # Test if the issue is with the user's repository specifically
        print(f"\n🔍 Checking user's repository directly...")
        try:
            # Use GitHub API directly to check if repo exists and has commits
            session = await github_commit_service._get_session()
            
            # Check MugundhanY/fastapi-vosk
            url = "https://api.github.com/repos/MugundhanY/fastapi-vosk/commits?per_page=5"
            print(f"   Testing URL: {url}")
            
            async with session.get(url) as response:
                print(f"   Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"   Raw API response: Found {len(data)} commits")
                    
                    if data:
                        print(f"   ✅ Repository has commits!")
                        for i, commit in enumerate(data[:2]):
                            print(f"      Commit {i+1}: {commit['sha'][:8]} - {commit['commit']['message'][:50]}...")
                    else:
                        print(f"   ⚠️ Repository exists but has no commits")
                elif response.status == 404:
                    print(f"   ❌ Repository not found (404)")
                elif response.status == 401:
                    print(f"   ❌ Authentication required (401)")
                else:
                    print(f"   ❌ HTTP error: {response.status}")
                    text = await response.text()
                    print(f"      Response: {text[:200]}...")
                    
        except Exception as e:
            print(f"   ❌ Direct API test failed: {e}")
        
        print(f"\n=== COMMIT FETCHING TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Commit fetching test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await github_commit_service.close()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_commit_fetching())
