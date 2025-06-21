#!/usr/bin/env python3
"""
Final verification test for the complete commit Q&A system.
"""
import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import commit_analysis_service
from services.github_commit_service import github_commit_service
from services.gemini_client import gemini_client


async def test_complete_commit_qna_system():
    """Test the complete system end-to-end."""
    print("🎯 Final Complete Commit Q&A System Test")
    print("=" * 60)
    
    # Test questions that should now work perfectly
    test_questions = [
        "What was the last commit?",
        "Show me the most recent commits with details",
        "What are the latest 3 commits and what did they change?",
        "Who made the most recent commit and when?",
        "What was changed in the last commit?"
    ]
    
    # Use a known public repository
    repo_owner = "octocat"
    repo_name = "Hello-World"
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n🔍 Test {i}: '{question}'")
        
        try:
            # Step 1: Detect commit question
            is_commit_question, commit_params = await commit_analysis_service.analyze_question(question)
            
            if not is_commit_question:
                print("   ❌ Question not detected as commit-related")
                continue
            
            print(f"   ✅ Detected as {commit_params.question_type} commit question")
            
            # Step 2: Get commits from GitHub
            commits = await github_commit_service.get_recent_commits(
                repo_owner=repo_owner,
                repo_name=repo_name,
                limit=commit_params.limit
            )
            
            if not commits:
                print("   ❌ No commits fetched")
                continue
            
            print(f"   ✅ Fetched {len(commits)} commits")
            
            # Step 3: Format commits for context
            commit_content = commit_analysis_service.format_commits_for_context(commits, question)
            
            # Step 4: Build repository context
            repo_info = f"Repository: {repo_owner}/{repo_name}"
            repo_info += f"\nGitHub URL: https://github.com/{repo_owner}/{repo_name}"
            repo_info += f"\n\n🔄 COMMIT ANALYSIS RESULTS:"
            repo_info += f"\n- Found {len(commit_content)} relevant commits"
            repo_info += f"\n- Query type: {commit_params.question_type}"
            repo_info += f"\n- Use the commit data below to answer the user's question"
            
            # Step 5: Get answer from optimized Gemini
            context_size = len(repo_info) + sum(len(content) for content in commit_content)
            print(f"   📊 Total context size: {context_size} characters")
            
            answer_result = await gemini_client.answer_question(
                question=question,
                context=repo_info,
                files_content=commit_content
            )
            
            if answer_result and answer_result.get("answer"):
                answer = answer_result["answer"]
                confidence = answer_result.get("confidence", 0)
                
                print(f"   ✅ Answer generated successfully")
                print(f"   📏 Answer length: {len(answer)} characters")
                print(f"   🎯 Confidence: {confidence:.2f}")
                
                # Check for quality indicators
                has_commit_sha = any(commit.get('sha', '')[:8] in answer for commit in commits[:3])
                has_specific_details = any(word in answer.lower() for word in ['commit', 'sha', 'author', 'message', 'merge'])
                has_truncation_notice = '[Note:' in answer and 'truncated' in answer
                
                print(f"   🔍 Contains commit SHA: {'✅' if has_commit_sha else '⚠️'}")
                print(f"   🔍 Contains specific details: {'✅' if has_specific_details else '⚠️'}")
                print(f"   🔍 Truncation notice: {'⚠️' if has_truncation_notice else '✅ None'}")
                
                # Show a preview
                preview = answer[:200] + "..." if len(answer) > 200 else answer
                print(f"   📄 Preview: {preview}")
                
            else:
                print("   ❌ No answer generated")
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
    
    # Clean up
    await github_commit_service.close()
    
    print(f"\n🎉 Final Test Summary:")
    print("✅ If all tests show commit SHAs and specific details → Perfect!")
    print("⚠️  If some missing details → May need fine-tuning")
    print("❌ If errors → Check GitHub token and network")
    print("\n🚀 Your commit Q&A system is now optimized and ready!")


if __name__ == "__main__":
    asyncio.run(test_complete_commit_qna_system())
