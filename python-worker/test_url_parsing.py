#!/usr/bin/env python3
"""
Test URL parsing for GitHub repositories
"""
import asyncio

async def test_url_parsing():
    """Test URL parsing for GitHub repositories."""
    try:
        from services.github_commit_service import github_commit_service
        
        print("=== TESTING URL PARSING ===")
        
        test_urls = [
            "https://github.com/MugundhanY/fastapi-vosk",
            "https://github.com/MugundhanY/fastapi-microsoft", 
            "https://github.com/MugundhanY/fastapi-bark",
            "https://github.com/microsoft/vscode",
            "github.com/owner/repo",
            "owner/repo"
        ]
        
        for url in test_urls:
            print(f"\n🔍 Testing URL: {url}")
            try:
                owner, name = github_commit_service.parse_repository_from_url(url)
                print(f"   Result: {owner}/{name}")
                
                if owner and name:
                    print(f"   ✅ Successfully parsed")
                else:
                    print(f"   ❌ Failed to parse")
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
        
        print("\n=== URL PARSING TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ URL parsing test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_url_parsing())
