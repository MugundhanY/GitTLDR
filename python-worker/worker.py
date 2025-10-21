"""
GitTLDR Python Worker - Main Entry Point

This worker handles AI-powered processing tasks:
- Repository file embedding
- Content summarization 
- Q&A processing
- Vector storage management
"""
import asyncio
import signal
import json
from typing import Dict, Any, Optional
from datetime import datetime

from config.settings import get_settings
from utils.logger import setup_logging, get_logger, TaskLogger
from services.redis_client import redis_client
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from services.neo4j_client import neo4j_client
from services.database_service import database_service
from services.gemini_function_caller import GeminiFunctionCaller
from services.github_api_client import GitHubClient
from services.tools.tool_registry import ToolRegistry
from services.tools.github.commit_tool import CommitTool, CommitDetailsTool
from services.tools.github.pr_tool import PullRequestTool, PullRequestDetailsTool
from services.tools.github.issue_tool import IssueTool, IssueDetailsTool
from services.tools.github.diff_tool import DiffTool, CompareTool
from processors.embedding import EmbeddingProcessor
from processors.summarization import SummarizationProcessor
from processors.file_processor import FileProcessor
from processors.meeting_summarizer import MeetingProcessor

# Setup logging
setup_logging()
logger = get_logger(__name__)


class GitTLDRWorker:
    """Main worker class for processing GitTLDR tasks."""
    
    def __init__(self):
        self.settings = get_settings()
        self.running = False
        self.processors = {
            "embedding": EmbeddingProcessor(),
            "summarization": SummarizationProcessor(),
            "file_processing": FileProcessor(),
            "meeting_summarizer": MeetingProcessor(),
        }
        
    async def start(self) -> None:
        """Start the worker."""
        logger.info("Starting GitTLDR Worker", version="0.1.0")
        
        try:
            # Connect to services
            await self._connect_services()
            
            # Start processing loop
            self.running = True
            await self._process_loop()
            
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        except Exception as e:
            logger.error("Worker failed", error=str(e))
            raise
        finally:
            await self._cleanup()
            
    async def stop(self) -> None:
        """Stop the worker gracefully."""
        logger.info("Stopping worker")
        self.running = False
        
    async def _connect_services(self) -> None:
        """Connect to external services."""
        logger.info("Connecting to services")
        
        # Connect to Redis
        await redis_client.connect()
        
        # Connect to Qdrant
        await qdrant_client.connect()
        
        # Connect to Neo4j if enabled
        if self.settings.enable_graph_retrieval:
            try:
                await neo4j_client.connect()
                logger.info("Neo4j graph database connected")
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j: {str(e)}")
                logger.warning("Continuing without graph-based retrieval")
        
        logger.info("All services connected")
        
    async def _process_loop(self) -> None:
        """Main processing loop with exponential backoff."""
        logger.info("Starting task processing loop")
        
        idle_count = 0
        max_timeout = 300  # Maximum 5 minutes
        base_timeout = 10  # Start with 10 seconds
        
        while self.running:
            try:
                # Calculate timeout with exponential backoff
                timeout = min(base_timeout * (2 ** min(idle_count, 4)), max_timeout)
                
                # Pop task from queue
                task_data = await redis_client.pop_task(timeout=timeout)
                
                if not task_data:
                    idle_count += 1
                    logger.debug(f"No tasks found, sleeping for {timeout}s (idle_count: {idle_count})")
                    continue  # Timeout, continue loop with longer timeout
                
                # Reset idle count when task is found
                idle_count = 0
                    
                # Process task
                await self._process_task(task_data)
                
            except Exception as e:
                logger.error("Error in processing loop", error=str(e))
                idle_count += 1
                await asyncio.sleep(5)  # Brief pause before retrying
                
    async def _process_task(self, task_data: Dict[str, Any]) -> None:
        """Process a single task."""
        task_id = task_data.get("jobId", task_data.get("id", "unknown"))
        task_type = task_data.get("type", "unknown")
        
        with TaskLogger(task_id, task_type) as task_logger:
            try:
                # Update status to processing (if enabled)
                if not self.settings.skip_intermediate_task_status:
                    await redis_client.update_task_status(task_id, "processing")
                
                # Route to appropriate processor
                result = await self._route_task(task_data, task_logger)
                
                # Always update final status to completed
                await redis_client.update_task_status(
                    task_id, "completed", result                )
                
                task_logger.info("Task processed successfully")
                
            except Exception as e:
                # Always update final status to failed
                await redis_client.update_task_status(
                    task_id, "failed", {"error": str(e)}
                )
                
                task_logger.error("Task processing failed", error=str(e))
                raise
    
    async def _get_user_github_token(self, user_id: str) -> Optional[str]:
        """Get GitHub token for a user from database."""
        try:
            user_info = await database_service.get_user_info(user_id)
            if user_info:
                return user_info.get('github_token')
            return None
        except Exception as e:
            logger.error(f"Failed to get GitHub token for user {user_id}", error=str(e))
            return None
    
    async def _get_repository_context(self, repository_id: str) -> Optional[Dict[str, Any]]:
        """Get repository metadata from database."""
        try:
            repo = await database_service.get_repository_status(repository_id)
            if repo:
                return {
                    "owner": repo.get("owner"),
                    "name": repo.get("name"),
                    "full_name": f"{repo.get('owner')}/{repo.get('name')}"
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get repository context for {repository_id}", error=str(e))
            return None
    
    def _should_use_github_tools(self, question: str) -> bool:
        """Determine if question requires GitHub API tools based on keywords."""
        github_keywords = [
            'commit', 'commits', 'pr', 'pull request', 'issue', 'diff', 
            'author', 'contributor', 'merge', 'branch', 'merged', 'closed',
            'opened', 'created by', 'who made', 'who created', 'recent changes'
        ]
        question_lower = question.lower()
        return any(keyword in question_lower for keyword in github_keywords)
    
    async def _route_task(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """Route task to appropriate processor."""
        task_type = task_data.get("type")
        
        if task_type == "full_analysis":
            return await self.processors["file_processing"].process_full_repository(task_data, logger)
            
        elif task_type == "embed_repository":
            return await self.processors["embedding"].process_repository(task_data, logger)
            
        elif task_type == "embed_file":
            return await self.processors["embedding"].process_file(task_data, logger)
        
        elif task_type == "summarize_repository":
            return await self.processors["summarization"].summarize_repository(task_data, logger)
            
        elif task_type == "summarize_file":
            return await self.processors["summarization"].summarize_file(task_data, logger)
            
        elif task_type == "answer_question":
            return await self.processors["embedding"].answer_question(task_data, logger)
            
        elif task_type == "qna":
            # Enhanced Q&A with GitHub function calling support
            question = task_data.get("question", "")
            user_id = task_data.get("userId")
            repository_id = task_data.get("repositoryId")
            question_id = task_data.get("questionId")
            
            logger.info(f"Processing Q&A question: {question_id}")
            
            # Check if question requires GitHub tools
            if self._should_use_github_tools(question):
                logger.info("Question detected as GitHub-related, attempting function calling")
                
                # Get user's GitHub token
                github_token = await self._get_user_github_token(user_id)
                
                if github_token:
                    logger.info("GitHub token found, using function calling")
                    
                    # Get repository context
                    repo_context = await self._get_repository_context(repository_id)
                    
                    if repo_context:
                        try:
                            # Initialize GitHub client
                            github_client = GitHubClient(github_token)
                            
                            # Initialize tool registry
                            tool_registry = ToolRegistry()
                            
                            # Register GitHub tools
                            tool_registry.register_tool(CommitTool(github_client))
                            tool_registry.register_tool(CommitDetailsTool(github_client))
                            tool_registry.register_tool(PullRequestTool(github_client))
                            tool_registry.register_tool(PullRequestDetailsTool(github_client))
                            tool_registry.register_tool(IssueTool(github_client))
                            tool_registry.register_tool(IssueDetailsTool(github_client))
                            tool_registry.register_tool(DiffTool(github_client))
                            tool_registry.register_tool(CompareTool(github_client))
                            
                            # Initialize Gemini client
                            gemini_client_instance = gemini_client  # Use existing gemini_client from services
                            
                            # Initialize function caller with correct argument order
                            function_caller = GeminiFunctionCaller(
                                gemini_client=gemini_client_instance,
                                tool_registry=tool_registry,
                                github_client=github_client
                            )
                            
                            # Process question with function calling
                            result = await function_caller.process_question(
                                question=question,
                                repository_context=repo_context
                            )
                            
                            # Format result for Redis queue
                            result_data = {
                                "question_id": question_id,
                                "question": question,
                                "answer": result['answer'],
                                "confidence": result.get('confidence', 0.8),
                                "relevant_files": result.get('relevant_files', []),
                                "user_id": user_id,
                                "repository_id": repository_id,
                                "context_files_used": len(result.get('relevant_files', [])),
                                "tool_executions": result.get('tool_executions', []),
                                "github_data_used": True
                            }
                            
                            # Push to results queue
                            await redis_client.lpush("qna_results", json.dumps(result_data))
                            
                            logger.info(f"GitHub function calling completed for question {question_id}")
                            return {
                                "status": "completed",
                                "answer": result['answer'],
                                "confidence": result.get('confidence', 0.8),
                                "tool_executions": result.get('tool_executions', []),
                                "github_data_used": True
                            }
                            
                        except Exception as e:
                            logger.error(f"GitHub function calling failed: {str(e)}", error=str(e))
                            logger.info("Falling back to traditional Q&A")
                            # Fall through to traditional Q&A
                    else:
                        logger.warning(f"Repository context not found for {repository_id}, using traditional Q&A")
                else:
                    logger.info("No GitHub token found, using traditional Q&A")
            else:
                logger.info("Question not GitHub-related, using traditional Q&A")
            
            # Traditional Q&A processing (fallback or default)
            return await self.processors["embedding"].answer_question(task_data, logger)
            
        elif task_type == "process_meeting":
            return await self.processors["meeting_summarizer"].process_meeting(task_data, logger)
        elif task_type == "meeting_qa":
            return await self.processors["meeting_summarizer"].process_meeting_qa(task_data, logger)
            
        else:
            raise ValueError(f"Unknown task type: {task_type}")
            
    async def _cleanup(self) -> None:
        """Cleanup resources."""
        logger.info("Cleaning up resources")
        
        try:
            await redis_client.disconnect()
        except Exception as e:
            logger.error("Error disconnecting from Redis", error=str(e))
        
        try:
            if neo4j_client.is_connected():
                await neo4j_client.disconnect()
        except Exception as e:
            logger.error("Error disconnecting from Neo4j", error=str(e))
            
        logger.info("Cleanup completed")


def setup_signal_handlers(worker: GitTLDRWorker) -> None:
    """Setup signal handlers for graceful shutdown."""
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}")
        asyncio.create_task(worker.stop())
        
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)


async def main():
    """Main entry point."""
    settings = get_settings()
    
    logger.info(
        "GitTLDR Python Worker Starting",
        redis_url=settings.redis_url,
        qdrant_url=settings.qdrant_url,
        max_workers=settings.max_workers,
        queue_name=settings.queue_name
    )
    
    # Create and start worker
    worker = GitTLDRWorker()
    setup_signal_handlers(worker)
    
    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())
