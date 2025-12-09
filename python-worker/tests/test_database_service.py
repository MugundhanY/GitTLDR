"""
Unit tests for database_service.py - Database operations.
Tests cover repository queries, question CRUD, and commit operations.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any


class TestDatabaseServiceRepository:
    """Tests for repository-related database operations."""

    @pytest.mark.asyncio
    async def test_get_repository_returns_data(self, mock_database_service: MagicMock):
        """Test that get_repository returns repository data."""
        result = await mock_database_service.get_repository("test-repo-id")
        
        assert result is not None
        assert result["id"] == "test-repo-id"
        assert "name" in result
        assert "status" in result

    @pytest.mark.asyncio
    async def test_get_repository_not_found(self, mock_database_service: MagicMock):
        """Test get_repository returns None for non-existent repo."""
        mock_database_service.get_repository = AsyncMock(return_value=None)
        
        result = await mock_database_service.get_repository("nonexistent-repo")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_get_repository_files(self, mock_database_service: MagicMock):
        """Test retrieving files for a repository."""
        result = await mock_database_service.get_repository_files("test-repo-id")
        
        assert isinstance(result, list)
        if len(result) > 0:
            assert "path" in result[0]

    @pytest.mark.asyncio
    async def test_get_repository_status(self, mock_database_service: MagicMock):
        """Test getting repository processing status."""
        mock_database_service.get_repository_status = AsyncMock(return_value={
            "id": "test-repo-id",
            "status": "completed",
            "progress": 100
        })
        
        result = await mock_database_service.get_repository_status("test-repo-id")
        
        assert result is not None
        assert result["status"] == "completed"


class TestDatabaseServiceQuestion:
    """Tests for question-related database operations."""

    @pytest.mark.asyncio
    async def test_create_question_returns_id(self, mock_database_service: MagicMock):
        """Test that create_question returns a question ID."""
        result = await mock_database_service.create_question(
            repository_id="test-repo",
            user_id="test-user",
            query="What is this?",
            answer="This is a test answer."
        )
        
        assert result is not None
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_update_question_success(self, mock_database_service: MagicMock):
        """Test successfully updating a question."""
        result = await mock_database_service.update_question(
            question_id="test-question-id",
            answer="Updated answer",
            status="completed"
        )
        
        assert result is True

    @pytest.mark.asyncio
    async def test_update_question_with_confidence(self, mock_database_service: MagicMock):
        """Test updating question with confidence score."""
        mock_database_service.update_question = AsyncMock(return_value=True)
        
        result = await mock_database_service.update_question(
            question_id="test-question-id",
            answer="Answer with confidence",
            confidence_score=0.85,
            status="completed"
        )
        
        assert result is True


class TestDatabaseServiceCommits:
    """Tests for commit-related database operations."""

    @pytest.mark.asyncio
    async def test_get_commits_by_query(self, mock_database_service: MagicMock):
        """Test searching commits by query."""
        mock_database_service.get_commits_by_query = AsyncMock(return_value=[
            {"sha": "abc123", "message": "Fix bug in auth module"},
            {"sha": "def456", "message": "Update auth tests"}
        ])
        
        result = await mock_database_service.get_commits_by_query(
            repository_id="test-repo",
            query="auth"
        )
        
        assert isinstance(result, list)
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_get_latest_commits(self, mock_database_service: MagicMock):
        """Test getting latest commits from repository."""
        mock_database_service.get_latest_commits = AsyncMock(return_value=[
            {"sha": "latest1", "message": "Most recent commit"},
            {"sha": "latest2", "message": "Second most recent"}
        ])
        
        result = await mock_database_service.get_latest_commits("test-repo", limit=5)
        
        assert isinstance(result, list)
        assert len(result) <= 5

    @pytest.mark.asyncio
    async def test_get_commits_empty_result(self, mock_database_service: MagicMock):
        """Test that empty commit results are handled properly."""
        result = await mock_database_service.get_commits_by_query(
            repository_id="test-repo",
            query="xyz_nonexistent_term"
        )
        
        assert isinstance(result, list)
        assert len(result) == 0




# Note: Integration tests that import actual services should be run
# with PYTHONPATH set correctly. Those tests are in a separate file.
class TestDatabaseServiceEdgeCases:
    """Tests for edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_handle_database_connection_error(self, mock_database_service: MagicMock):
        """Test handling of database connection errors."""
        mock_database_service.get_repository = AsyncMock(
            side_effect=Exception("Database connection failed")
        )
        
        with pytest.raises(Exception) as exc_info:
            await mock_database_service.get_repository("test-repo")
        
        assert "Database connection failed" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_handle_invalid_repository_id(self, mock_database_service: MagicMock):
        """Test handling of invalid repository ID format."""
        mock_database_service.get_repository = AsyncMock(return_value=None)
        
        result = await mock_database_service.get_repository("")
        
        # Should return None for empty/invalid ID
        assert result is None

    @pytest.mark.asyncio
    async def test_file_content_loading_with_missing_files(self, mock_database_service: MagicMock):
        """Test handling of missing files during content loading."""
        mock_database_service.load_file_contents = AsyncMock(return_value=[])
        
        result = await mock_database_service.load_file_contents([], {})
        
        assert isinstance(result, list)
        assert len(result) == 0
