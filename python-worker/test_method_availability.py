#!/usr/bin/env python3
"""
Test the commit analysis service import and method availability
"""
import asyncio

async def test_method_availability():
    """Test if methods are available on the commit analysis service."""
    try:
        from services.commit_analysis_service import commit_analysis_service
        
        print("=== TESTING METHOD AVAILABILITY ===")
        print(f"Service type: {type(commit_analysis_service)}")
        print(f"Service dir: {[attr for attr in dir(commit_analysis_service) if not attr.startswith('__')]}")
        
        # Check specific methods
        methods_to_check = [
            '_check_rate_limit',
            '_get_repository_github_info', 
            '_query_database_for_commits',
            'get_commits_for_question',
            'analyze_question'
        ]
        
        for method_name in methods_to_check:
            has_method = hasattr(commit_analysis_service, method_name)
            print(f"   {method_name}: {'✅' if has_method else '❌'}")
            
            if has_method:
                method = getattr(commit_analysis_service, method_name)
                print(f"      Type: {type(method)}")
        
        # Try to call _check_rate_limit directly
        print(f"\n🔍 Testing _check_rate_limit call...")
        try:
            await commit_analysis_service._check_rate_limit()
            print(f"   ✅ _check_rate_limit works")
        except Exception as e:
            print(f"   ❌ _check_rate_limit error: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n=== METHOD AVAILABILITY TEST COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Method availability test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_method_availability())
