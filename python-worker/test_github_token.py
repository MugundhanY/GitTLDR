#!/usr/bin/env python3
"""
Test GitHub token configuration
"""
import asyncio
import os

async def test_github_token():
    """Test if GitHub token is configured."""
    try:
        from config.settings import get_settings
        from services.github_commit_service import github_commit_service
        
        print("=== TESTING GITHUB TOKEN CONFIGURATION ===")
        
        settings = get_settings()
        print(f"GitHub token configured: {'Yes' if settings.github_token else 'No'}")
        print(f"GitHub token value: {settings.github_token}")
        
        if not settings.github_token or settings.github_token == "None":
            print("❌ GitHub token is not configured!")
            print("💡 To fix this:")
            print("   1. Set the GITHUB_TOKEN environment variable")
            print("   2. Or update config/settings.py")
            print("   3. Get a token from: https://github.com/settings/tokens")
            print("   4. Required scopes: repo (for private repos) or public_repo")
            return False
        
        # Test a simple API call
        try:
            print("\n🧪 Testing GitHub API access...")
            session = await github_commit_service._get_session()
            
            # Test with a public repository
            async with session.get("https://api.github.com/repos/microsoft/vscode/commits?per_page=1") as response:
                if response.status == 200:
                    print("✅ GitHub API access working!")
                    data = await response.json()
                    if data:
                        print(f"   Sample commit: {data[0]['sha'][:8]} - {data[0]['commit']['message'][:50]}...")
                    return True
                elif response.status == 401:
                    print("❌ GitHub API authentication failed (401)")
                    print("   Check your GitHub token permissions")
                    return False
                elif response.status == 403:
                    print("❌ GitHub API rate limit or forbidden (403)")
                    print("   Your token may have insufficient permissions")
                    return False
                else:
                    print(f"❌ GitHub API error: {response.status}")
                    return False
                    
        except Exception as e:
            print(f"❌ GitHub API test failed: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False
    finally:
        try:
            await github_commit_service.close()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_github_token())
