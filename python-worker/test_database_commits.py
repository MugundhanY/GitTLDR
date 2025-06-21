import asyncio
import sys
import os

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.database_service import database_service
from services.commit_analysis_service import commit_analysis_service, CommitQueryParams

async def test_database_commits():
    """Test if commits exist in the database."""
    print("Testing Database Commit Queries")
    print("=" * 50)
    
    # Try to test with some sample repository IDs
    # You'll need to replace this with actual repository IDs from your database
    test_repo_ids = [
        "test-repo-1",
        "clyrt8u51000008md1kk1a2j4",  # Example ID format
        "sample-repo"
    ]
    
    for repo_id in test_repo_ids:
        print(f"\nTesting repository: {repo_id}")
        print("-" * 30)
        
        try:
            # Test recent commits
            print("Testing recent commits...")
            recent_commits = await database_service.get_recent_commits(repo_id, limit=5)
            print(f"Found {len(recent_commits)} recent commits")
            
            if recent_commits:
                for i, commit in enumerate(recent_commits[:2]):  # Show first 2
                    print(f"  Commit {i+1}: {commit.get('sha', 'N/A')[:8]} - {commit.get('message', 'N/A')[:50]}")
                break  # Found commits, no need to test other repos
            else:
                print("  No recent commits found")
                
        except Exception as e:
            print(f"  Error querying commits: {str(e)}")
    
    print("\n" + "=" * 50)
    
    # Test the full commit analysis flow
    print("Testing Full Commit Analysis Flow")
    print("=" * 50)
    
    question = "what was the last commit?"
    is_commit, params = await commit_analysis_service.analyze_question(question)
    
    if is_commit and params:
        print(f"Question detected as commit question: {params.question_type}")
        
        # Try with first repo that might have data
        for repo_id in test_repo_ids:
            try:
                commits = await commit_analysis_service.get_commits_for_question(repo_id, params)
                print(f"Repo {repo_id}: Found {len(commits)} commits")
                
                if commits:
                    # Test formatting
                    formatted = commit_analysis_service.format_commits_for_context(commits, question)
                    print(f"Formatted context has {len(formatted)} sections")
                    if formatted:
                        print(f"First section preview: {formatted[0][:100]}...")
                    break
            except Exception as e:
                print(f"Error testing repo {repo_id}: {str(e)}")
    
    print("\nTest completed!")

if __name__ == "__main__":
    asyncio.run(test_database_commits())
