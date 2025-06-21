#!/usr/bin/env python3
"""
Full end-to-end test of commit Q&A flow.
This simulates the exact flow that happens when a user asks a commit question.
"""
import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import commit_analysis_service
from services.github_commit_service import github_commit_service
from services.database_service import database_service
from services.gemini_client import gemini_client
from processors.embedding import EmbeddingProcessor


async def test_full_qna_flow():
    """Test the complete Q&A flow for commit questions."""
    print("🧪 Testing Full Commit Q&A Flow...")
    print("=" * 60)
    
    # Test with a public repository that we know has commits
    test_repo_url = "https://github.com/octocat/Hello-World"
    test_question = "What was the last commit?"
    
    print(f"🔍 Question: '{test_question}'")
    print(f"📁 Test Repository: {test_repo_url}")
    
    try:
        # Step 1: Parse repository URL to get owner/name
        repo_parts = test_repo_url.replace("https://github.com/", "").split("/")
        if len(repo_parts) >= 2:
            repo_owner = repo_parts[0]
            repo_name = repo_parts[1]
            print(f"📋 Parsed: {repo_owner}/{repo_name}")
        else:
            print("❌ Invalid repository URL format")
            return
        
        # Step 2: Test commit analysis
        print(f"\n🔍 Step 1: Analyzing question...")
        is_commit_question, commit_params = await commit_analysis_service.analyze_question(test_question)
        
        if not is_commit_question:
            print("❌ Question not detected as commit-related")
            return
        
        print(f"✅ Detected as {commit_params.question_type} commit question")
        
        # Step 3: Fetch commits from GitHub
        print(f"\n🔗 Step 2: Fetching commits from GitHub...")
        commits = await github_commit_service.get_recent_commits(
            repo_owner=repo_owner,
            repo_name=repo_name,
            limit=commit_params.limit
        )
        
        if not commits:
            print("❌ No commits fetched from GitHub")
            return
        
        print(f"✅ Fetched {len(commits)} commits")
        for i, commit in enumerate(commits[:3], 1):  # Show first 3
            print(f"   {i}. {commit.get('sha', '')[:8]} - {commit.get('message', '')[:60]}...")
        
        # Step 4: Format commits for context
        print(f"\n📝 Step 3: Formatting commits for AI context...")
        commit_content = commit_analysis_service.format_commits_for_context(commits, test_question)
        
        if not commit_content:
            print("❌ Failed to format commits")
            return
        
        print(f"✅ Formatted {len(commit_content)} commit context sections")
        print(f"   Sample context length: {len(commit_content[0]) if commit_content else 0} characters")
        
        # Step 5: Build repository context
        print(f"\n🏗️ Step 4: Building repository context...")
        repo_info = f"Repository: {repo_owner}/{repo_name}"
        repo_info += f"\nGitHub URL: {test_repo_url}"
        repo_info += f"\n\n🔄 COMMIT ANALYSIS RESULTS:"
        repo_info += f"\n- Found {len(commit_content)} relevant commits"
        repo_info += f"\n- Query type: {commit_params.question_type}"
        repo_info += f"\n- Use the commit data below to answer the user's question"
        
        print(f"✅ Repository context built ({len(repo_info)} characters)")
        
        # Step 6: Test Gemini Q&A
        print(f"\n🤖 Step 5: Testing Gemini Q&A...")
        
        try:
            answer_result = await gemini_client.answer_question(
                question=test_question,
                context=repo_info,
                files_content=commit_content
            )
            
            if answer_result and answer_result.get("answer"):
                answer = answer_result["answer"]
                confidence = answer_result.get("confidence", 0)
                
                print(f"✅ Gemini responded successfully")
                print(f"   Answer length: {len(answer)} characters")
                print(f"   Confidence: {confidence:.2f}")
                print(f"   Response preview: {answer[:200]}...")
                
                # Check for truncation indicators
                if len(answer) >= 3800:
                    print("⚠️  Response may be truncated (close to token limit)")
                
                if not answer.endswith(('.', '!', '?', '```')):
                    print("⚠️  Response may be incomplete (doesn't end with proper punctuation)")
                
                # Check for specific commit information
                commit_found = False
                for commit in commits[:3]:
                    commit_sha = commit.get('sha', '')[:8]
                    if commit_sha and commit_sha in answer:
                        print(f"✅ Found specific commit reference: {commit_sha}")
                        commit_found = True
                        break
                
                if not commit_found:
                    print("⚠️  No specific commit SHAs found in answer")
                
                # Full answer display
                print(f"\n📄 Full Answer:")
                print("=" * 40)
                print(answer)
                print("=" * 40)
                
            else:
                print("❌ Gemini returned empty or invalid response")
                print(f"   Raw result: {answer_result}")
        
        except Exception as gemini_error:
            print(f"❌ Gemini API error: {str(gemini_error)}")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
    
    finally:
        # Clean up
        await github_commit_service.close()
        print(f"\n🧹 Cleanup completed")


async def test_with_user_repository():
    """Test with a user's actual repository if they have one configured."""
    print(f"\n🔄 Testing with configured repository...")
    
    try:
        # Try to get repositories from database
        # This would need a real repository ID from your database
        print("ℹ️  To test with your repository, modify this function with a real repository ID")
        print("   from your database and uncomment the test code below.")
        
        # Uncomment and modify this section to test with real repo:
        # repository_id = "your-repo-id-here"
        # repo_status = await database_service.get_repository_status(repository_id)
        # if repo_status:
        #     print(f"Found repository: {repo_status.get('name')}")
        #     # Test the full EmbeddingProcessor.answer_question flow
        #     processor = EmbeddingProcessor()
        #     result = await processor.answer_question({
        #         "questionId": "test-question",
        #         "repositoryId": repository_id,
        #         "userId": "test-user",
        #         "question": "What was the last commit?",
        #         "attachments": []
        #     }, logger)
        #     print(f"Full Q&A result: {result}")
        
    except Exception as e:
        print(f"❌ User repository test failed: {str(e)}")


async def main():
    """Main test function."""
    print("🚀 Full Commit Q&A Flow Test")
    print("=" * 60)
    
    await test_full_qna_flow()
    await test_with_user_repository()
    
    print("\n" + "=" * 60)
    print("🎯 Test Summary:")
    print("✅ If all steps pass but answer is short → Gemini might be hitting safety filters")
    print("⚠️  If answer is truncated → Need to increase max_output_tokens further")
    print("❌ If commits not found → Check GitHub token or repository access")
    print("🔧 If any step fails → Check the specific error messages above")


if __name__ == "__main__":
    asyncio.run(main())
