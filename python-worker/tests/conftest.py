"""
Pytest fixtures and shared test configurations for python-worker tests.
Uses a simplified approach that doesn't require patching the FastAPI app.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import Generator


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_redis() -> MagicMock:
    """Mock Redis client for testing."""
    mock = MagicMock()
    mock.ping = AsyncMock(return_value=True)
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.hgetall = AsyncMock(return_value={})
    mock.hset = AsyncMock(return_value=1)
    mock.lpush = AsyncMock(return_value=1)
    mock.publish = AsyncMock(return_value=1)
    mock.connect = AsyncMock(return_value=None)
    mock.disconnect = AsyncMock(return_value=None)
    return mock


@pytest.fixture
def mock_database_service() -> MagicMock:
    """Mock DatabaseService for testing without database connection."""
    mock = MagicMock()
    mock.get_repository = AsyncMock(return_value={
        "id": "test-repo-id",
        "name": "test-repo",
        "url": "https://github.com/test/test-repo",
        "status": "completed"
    })
    mock.get_repository_files = AsyncMock(return_value=[
        {"path": "README.md", "type": "file", "size": 100}
    ])
    mock.create_question = AsyncMock(return_value="test-question-id")
    mock.update_question = AsyncMock(return_value=True)
    mock.get_commits_by_query = AsyncMock(return_value=[])
    mock.get_latest_commits = AsyncMock(return_value=[])
    mock.get_repository_status = AsyncMock(return_value={
        "id": "test-repo-id",
        "status": "completed",
        "progress": 100
    })
    mock.load_file_contents = AsyncMock(return_value=[])
    return mock


@pytest.fixture
def mock_gemini_client() -> MagicMock:
    """Mock Gemini client for testing without API calls."""
    mock = MagicMock()
    mock.generate_response = AsyncMock(return_value={
        "answer": "This is a test answer from mocked Gemini.",
        "confidence": 0.95,
        "sources": []
    })
    mock.get_status = MagicMock(return_value={
        "available": True,
        "model": "gemini-pro"
    })
    mock.get_rate_limit_status = MagicMock(return_value={
        "available": True,
        "rate_limited": False
    })
    mock.reset_circuit_breakers = MagicMock(return_value=None)
    return mock


@pytest.fixture
def mock_qdrant_client() -> MagicMock:
    """Mock Qdrant client for testing vector operations."""
    mock = MagicMock()
    mock.search = AsyncMock(return_value=[])
    mock.upsert = AsyncMock(return_value=True)
    mock.connect = AsyncMock(return_value=None)
    mock.disconnect = AsyncMock(return_value=None)
    mock.check_connection = AsyncMock(return_value=True)
    return mock


@pytest.fixture
def sample_repository_data() -> dict:
    """Sample repository data for testing."""
    return {
        "id": "test-repo-123",
        "name": "sample-project",
        "fullName": "testuser/sample-project",
        "url": "https://github.com/testuser/sample-project",
        "description": "A sample project for testing",
        "language": "Python",
        "status": "completed"
    }


@pytest.fixture
def sample_question_data() -> dict:
    """Sample question data for testing Q&A endpoints."""
    return {
        "repository_id": "test-repo-123",
        "question": "What does this project do?",
        "user_id": "test-user-456",
        "question_id": "q-789",
        "attachments": []
    }


@pytest.fixture
def sample_qna_request() -> dict:
    """Sample Q&A request payload."""
    return {
        "repository_id": "test-repo-123",
        "question": "How do I run the tests?",
        "user_id": "test-user-456"
    }
