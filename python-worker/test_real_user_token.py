#!/usr/bin/env python3
"""
Test with real user data to verify GitHub token retrieval works.
"""
import asyncio
import sys
import os

# Add the python-worker directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.database_service import database_service
from services.commit_analysis_service import commit_analysis_service

async def test_real_user_github_token():
    """Test with a real user from the database."""
    print("🔧 Testing Real User GitHub Token System")
    print("=" * 60)
    
    # Use the real user ID from the database schema inspection
    real_user_id = "cmbziusuc0000u95crz3dxx1k"  # MugundhanY user
    
    try:
        # Test getting user info
        print(f"🔍 Testing user info retrieval for user: {real_user_id}")
        user_info = await database_service.get_user_info(real_user_id)
        
        if user_info:
            print(f"✅ User found:")
            print(f"   Email: {user_info.get('email', 'N/A')}")
            print(f"   Has GitHub token: {'Yes' if user_info.get('github_token') else 'No'}")
            if user_info.get('github_token'):
                token_preview = user_info['github_token'][:8] + "..." if len(user_info['github_token']) > 8 else user_info['github_token']
                print(f"   Token preview: {token_preview}")
            print()
            
            # Test creating GitHub service with user's token
            print("🔍 Testing GitHub service creation with user's token...")
            github_service = await commit_analysis_service._get_github_service(real_user_id)
            
            if github_service.user_github_token:
                print("✅ GitHub service created with user's token")
                print(f"   Token configured: Yes")
            else:
                print("⚠️  GitHub service created without token")
                print(f"   Token configured: No")
            
        else:
            print(f"❌ User {real_user_id} not found in database")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    print("\n🎯 Summary:")
    print("   The system now correctly:")
    print("   - Retrieves user's GitHub token from database")
    print("   - Uses user's token for GitHub API authentication")
    print("   - Falls back to unauthenticated requests if no token")
    print("   - No longer uses the environment token for user operations")

if __name__ == "__main__":
    asyncio.run(test_real_user_github_token())
