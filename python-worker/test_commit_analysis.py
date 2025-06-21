import asyncio
import sys
import os

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.commit_analysis_service import commit_analysis_service

async def test_commit_analysis():
    """Test commit analysis functionality."""
    test_questions = [
        "what was the last commit?",
        "show me recent commits",
        "what commits were made yesterday?",
        "who committed code last week?",
        "show commits by john",
        "find commits with 'fix' in message",
        "what changed in file app.py?",
        "commit abc123",
        "regular question about the codebase"
    ]
    
    print("Testing Commit Analysis Service")
    print("=" * 50)
    
    for question in test_questions:
        try:
            is_commit, params = await commit_analysis_service.analyze_question(question)
            print(f"\nQuestion: '{question}'")
            print(f"Is commit question: {is_commit}")
            if params:
                print(f"Question type: {params.question_type}")
                print(f"Limit: {params.limit}")
                if params.author_pattern:
                    print(f"Author pattern: {params.author_pattern}")
                if params.message_pattern:
                    print(f"Message pattern: {params.message_pattern}")
                if params.file_pattern:
                    print(f"File pattern: {params.file_pattern}")
                if params.start_date:
                    print(f"Start date: {params.start_date}")
                if params.end_date:
                    print(f"End date: {params.end_date}")
        except Exception as e:
            print(f"\nError analyzing question '{question}': {str(e)}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    asyncio.run(test_commit_analysis())
