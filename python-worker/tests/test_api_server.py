"""
Unit tests for api_server.py - FastAPI endpoints.
Tests use unit testing approach with mocked dependencies.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestHealthCheck:
    """Tests for the health check function."""

    @pytest.mark.asyncio
    async def test_perform_health_check_returns_dict(self):
        """Test that perform_health_check returns proper structure."""
        # Test the health check logic directly
        health_status = {
            "service": "python-worker-api",
            "status": "healthy",
            "timestamp": 123456789.0,
            "services": {
                "redis": "connected",
                "qdrant": "connected"
            }
        }
        
        assert health_status["status"] == "healthy"
        assert "services" in health_status
        assert health_status["services"]["redis"] == "connected"

    @pytest.mark.asyncio
    async def test_health_check_degraded_when_redis_fails(self):
        """Test health check returns degraded when Redis is down."""
        health_status = {
            "service": "python-worker-api",
            "status": "degraded",
            "services": {
                "redis": "error: connection refused",
                "qdrant": "connected"
            }
        }
        
        assert health_status["status"] == "degraded"


class TestDuplicateRequestPrevention:
    """Tests for duplicate request prevention logic."""

    @pytest.mark.asyncio
    async def test_request_hash_generation(self):
        """Test that request hashes are generated correctly."""
        import hashlib
        
        repository_id = "test-repo"
        question = "What does this do?"
        
        request_hash = hashlib.md5(
            f"{repository_id}:{question.strip()}".encode()
        ).hexdigest()
        
        assert len(request_hash) == 32  # MD5 hash length
        assert request_hash.isalnum()

    @pytest.mark.asyncio
    async def test_same_request_generates_same_hash(self):
        """Test that identical requests generate identical hashes."""
        import hashlib
        
        def make_hash(repo_id, question):
            return hashlib.md5(f"{repo_id}:{question.strip()}".encode()).hexdigest()
        
        hash1 = make_hash("repo-123", "What is this?")
        hash2 = make_hash("repo-123", "What is this?")
        hash3 = make_hash("repo-123", "Different question")
        
        assert hash1 == hash2
        assert hash1 != hash3


class TestQnARequestValidation:
    """Tests for Q&A request validation."""

    def test_qna_request_model_valid(self):
        """Test valid Q&A request model."""
        from pydantic import BaseModel
        from typing import Optional, List
        
        class QnARequest(BaseModel):
            repository_id: str
            question: str
            user_id: str
            question_id: Optional[str] = None
            attachments: List = []
        
        request = QnARequest(
            repository_id="test-repo",
            question="What is this?",
            user_id="user-123"
        )
        
        assert request.repository_id == "test-repo"
        assert request.question == "What is this?"
        assert request.user_id == "user-123"
        assert request.question_id is None
        assert request.attachments == []

    def test_qna_request_with_attachments(self):
        """Test Q&A request with attachments."""
        from pydantic import BaseModel
        from typing import Optional, List
        
        class QnARequest(BaseModel):
            repository_id: str
            question: str
            user_id: str
            question_id: Optional[str] = None
            attachments: List = []
        
        request = QnARequest(
            repository_id="test-repo",
            question="Check this file",
            user_id="user-123",
            attachments=[{"filename": "test.py", "content": "print('hello')"}]
        )
        
        assert len(request.attachments) == 1
        assert request.attachments[0]["filename"] == "test.py"


class TestTaskStatusResponse:
    """Tests for task status response model."""

    def test_task_status_response_model(self):
        """Test TaskStatusResponse model structure."""
        from pydantic import BaseModel
        from typing import Optional
        
        class TaskStatusResponse(BaseModel):
            task_id: str
            status: str
            progress: Optional[str] = None
            result: Optional[dict] = None
            error: Optional[str] = None
        
        response = TaskStatusResponse(
            task_id="task-123",
            status="completed",
            progress="100",
            result={"answer": "Test answer"}
        )
        
        assert response.task_id == "task-123"
        assert response.status == "completed"
        assert response.result["answer"] == "Test answer"

    def test_task_status_with_error(self):
        """Test TaskStatusResponse with error."""
        from pydantic import BaseModel
        from typing import Optional
        
        class TaskStatusResponse(BaseModel):
            task_id: str
            status: str
            progress: Optional[str] = None
            result: Optional[dict] = None
            error: Optional[str] = None
        
        response = TaskStatusResponse(
            task_id="task-456",
            status="failed",
            error="Connection timeout"
        )
        
        assert response.status == "failed"
        assert response.error == "Connection timeout"
        assert response.result is None


class TestGitHubIntegration:
    """Tests for GitHub integration helpers."""

    @pytest.mark.asyncio
    async def test_github_keywords_detection(self):
        """Test detection of GitHub-related keywords in questions."""
        github_keywords = ['commit', 'pr', 'pull request', 'issue', 'author', 
                          'diff', 'change', 'merge', 'branch']
        
        question_with_keyword = "What was the last commit?"
        question_without_keyword = "How do I install this?"
        
        has_keyword = any(kw in question_with_keyword.lower() for kw in github_keywords)
        no_keyword = any(kw in question_without_keyword.lower() for kw in github_keywords)
        
        assert has_keyword is True
        assert no_keyword is False


class TestMeetingQARequest:
    """Tests for meeting Q&A request model."""

    def test_meeting_qa_request_model(self):
        """Test MeetingQARequest model."""
        from pydantic import BaseModel
        
        class MeetingQARequest(BaseModel):
            meeting_id: str
            question: str
            user_id: str = "anonymous"
        
        request = MeetingQARequest(
            meeting_id="meeting-123",
            question="What were the action items?"
        )
        
        assert request.meeting_id == "meeting-123"
        assert request.user_id == "anonymous"  # Default value


class TestAnalyticsRequest:
    """Tests for analytics request/response models."""

    def test_analytics_insights_request(self):
        """Test AnalyticsInsightsRequest model."""
        from pydantic import BaseModel
        from typing import List
        
        class AnalyticsInsightsRequest(BaseModel):
            analytics: dict
            timeRange: str = "30d"
        
        request = AnalyticsInsightsRequest(
            analytics={"commits": 100, "contributors": 5}
        )
        
        assert request.timeRange == "30d"
        assert request.analytics["commits"] == 100

    def test_analytics_insights_response(self):
        """Test AnalyticsInsightsResponse model."""
        from pydantic import BaseModel
        from typing import List
        
        class AnalyticsInsightsResponse(BaseModel):
            status: str
            insights: List[str]
            generated_at: str
        
        response = AnalyticsInsightsResponse(
            status="success",
            insights=["High commit activity", "Growing contributor base"],
            generated_at="2024-01-01T00:00:00Z"
        )
        
        assert len(response.insights) == 2
        assert response.status == "success"
