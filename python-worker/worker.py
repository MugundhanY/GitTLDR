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
import os
from pathlib import Path

# Load .env into os.environ BEFORE importing anything else
# This ensures UnifiedAIClient can read environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass  # dotenv not installed, will rely on system env vars

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
from processors.issue_fix_processor import IssueFixProcessor

# Import RATFV architecture
from agents.meta_controller import meta_controller

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
            "issue_fix": IssueFixProcessor(),  # Keep old processor as fallback
        }
        
        # No architecture flags needed - using standard RATFV pipeline
        

    
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
                
                # For issue_fix tasks, MetaController already set the correct final status
                # (READY_FOR_REVIEW, NEEDS_CLARIFICATION, etc.) - don't override it
                if task_type == "issue_fix":
                    # MetaController already published the correct status
                    task_logger.info(f"Task processed successfully (status already set by MetaController)")
                else:
                    # For other task types, update final status to completed
                    await redis_client.update_task_status(
                        task_id, "completed", result
                    )
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
            
        elif task_type == "issue_fix":
            # Use NEW RATFV MetaController with tool-based retrieval
            logger.info("🚀 Using NEW MetaController with tool-based retrieval")
            
            try:
                # Extract task data (handle both camelCase and snake_case)
                issue_fix_id = task_data.get("issueFixId") or task_data.get("issue_fix_id")
                repository_id = task_data.get("repositoryId") or task_data.get("repository_id")
                user_id = task_data.get("userId") or task_data.get("user_id")
                issue_number = task_data.get("issueNumber") or task_data.get("issue_number")
                issue_title = task_data.get("issueTitle") or task_data.get("issue_title", "")
                issue_body = task_data.get("issueBody") or task_data.get("issue_body", "")
                task_id = task_data.get("jobId", task_data.get("id"))
                
                logger.info(f"Processing issue fix: #{issue_number} - {issue_title}")
                
                # Call NEW MetaController with task_id for Redis updates
                fix_result = await meta_controller.process_auto_fix(
                    issue_fix_id=issue_fix_id,
                    repository_id=repository_id,
                    user_id=user_id,
                    issue_number=issue_number,
                    issue_title=issue_title,
                    issue_body=issue_body,
                    task_id=task_id
                )
                
                # CRITICAL: Check if fix_result is dict (error case) or FixResult object (success case)
                # MetaController returns dict when blocking delivery at 0% confidence
                if isinstance(fix_result, dict):
                    # Dict response means fix was blocked due to low confidence
                    confidence = fix_result.get('confidence', 0.0)
                    status = fix_result.get('status', 'failed')
                    logger.warning(f"⚠️ Received dict from MetaController (blocked delivery): status={status}, confidence={confidence:.1%}")
                    # Map the status to database format and return
                    return {
                        "success": False,
                        "status": "FAILED",  # Already set in DB by MetaController
                        "confidence": confidence,
                        "operations": [],
                        "explanation": fix_result.get('reason', 'Fix blocked due to low confidence'),
                        "metrics": {}
                    }
                
                logger.info(f"✅ MetaController completed: status={fix_result.status}, confidence={fix_result.confidence:.1%}")
                
                # Map MetaController status to database enum
                status_mapping = {
                    "success": "COMPLETED",
                    "failed": "FAILED",
                    "needs_clarification": "NEEDS_CLARIFICATION",
                    "analyzing": "ANALYZING",
                    "retrieving": "RETRIEVING_CODE",
                    "generating": "GENERATING_FIX",
                    "validating": "VALIDATING",
                    "ready": "READY_FOR_REVIEW",
                    "creating_pr": "CREATING_PR"
                }
                
                db_status = status_mapping.get(fix_result.status, "FAILED")
                
                # Store confidence in result for database update
                result = {
                    "success": fix_result.status == "success",
                    "status": db_status,
                    "confidence": fix_result.confidence,
                    "operations": fix_result.operations,
                    "explanation": fix_result.explanation,
                    "metrics": fix_result.metrics
                }
                
                # Ensure confidence is logged for UI display
                logger.info(f"📊 Returning result with confidence: {fix_result.confidence:.1%}")
                return result
                
            except Exception as e:
                logger.error(f"❌ MetaController failed: {e}", exc_info=True)
                # NO LEGACY FALLBACK - AI-only system, return proper failure
                return {
                    "success": False,
                    "status": "FAILED",
                    "confidence": 0.0,
                    "operations": [],
                    "explanation": f"❌ AI processing failed: {str(e)}\n\nPlease check logs for details.",
                    "metrics": {"error": str(e)}
                }
            
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
    
    async def _DISABLED_process_with_next_gen(self, task_data: Dict[str, Any], logger) -> Dict[str, Any]:
        """
        Process issue fix with Next-Gen Architecture.
        
        Flow:
        1. GeminiToolAgent generates solution (multi-turn, max 3 iterations with self-review)
        2. StaticValidator checks syntax, imports, style, security
        3. TestKitGenerator creates downloadable test kit
        4. Return solution + test kit URL to user
        
        Target: 80% first-attempt success, 95% cumulative with user feedback
        """
        logger.info("=" * 60)
        logger.info("NEXT-GEN ARCHITECTURE - ISSUE FIX PROCESSING")
        logger.info("=" * 60)
        
        # Extract task data
        issue_fix_id = task_data.get("issueFixId", "unknown")
        repository_id = task_data.get("repositoryId")
        user_id = task_data.get("userId")
        issue_number = task_data.get("issueNumber")
        issue_title = task_data.get("issueTitle", "")
        issue_body = task_data.get("issueBody", "")
        
        logger.info(f"Issue #{issue_number}: {issue_title}")
        logger.info(f"Repository: {repository_id}")
        
        # Get repository context
        repo_context = await self._get_repository_context(repository_id)
        if not repo_context:
            raise ValueError(f"Repository context not found for {repository_id}")
        
        # Keep repository_context as dict (don't convert to string!)
        repository_context = repo_context
        
        # Get components
        api_key_pool = self.next_gen_components["api_key_pool"]
        static_validator = self.next_gen_components["static_validator"]
        self_reviewer = self.next_gen_components["self_reviewer"]
        test_kit_generator = self.next_gen_components["test_kit_generator"]
        
        # Staging directory for this issue
        import os
        staging_dir = f"/tmp/gittldr_staging/issue_{issue_number}_{issue_fix_id}"
        os.makedirs(staging_dir, exist_ok=True)
        
        logger.info("\n📊 PHASE 1: ITERATIVE SOLUTION GENERATION")
        logger.info("-" * 60)
        
        # Create tool agent
        tool_agent = GeminiToolAgent(
            api_key_pool=api_key_pool,
            repository_id=repository_id,
            staging_dir=staging_dir
        )
        
        # Create iterative self-reviewer
        iterative_reviewer = IterativeSelfReviewer(tool_agent, self_reviewer)
        
        try:
            # Generate solution with iterative self-review (up to 3 attempts)
            solution_result = await iterative_reviewer.solve_with_review(
                issue_title=issue_title,
                issue_body=issue_body,
                repository_context=repository_context
            )
            
            # Extract solution and review
            solution = solution_result
            final_review = solution_result.get('review')
            iterations = solution_result.get('iterations', 1)
            
            logger.info(f"✅ Solution generated after {iterations} iteration(s)")
            logger.info(f"   Review score: {final_review.overall_score:.1f}/10")
            logger.info(f"   Completeness: {final_review.completeness_score:.1f}/10")
            logger.info(f"   Correctness: {final_review.correctness_score:.1f}/10")
            logger.info(f"   Quality: {final_review.quality_score:.1f}/10")
            logger.info(f"   Best Practices: {final_review.best_practices_score:.1f}/10")
            
        except Exception as e:
            logger.error(f"❌ Solution generation failed: {str(e)}")
            raise
        
        logger.info("\n📊 PHASE 2: STATIC VALIDATION")
        logger.info("-" * 60)
        
        # Validate solution
        try:
            changes = solution.get('changes', [])
            validation_result = await static_validator.validate_solution(
                changes=changes,
                staging_dir=staging_dir
            )
            
            logger.info(f"{'✅' if validation_result.passed else '❌'} Validation: {validation_result.summary}")
            logger.info(f"   Confidence: {validation_result.confidence_score:.1%}")
            logger.info(f"   Errors: {validation_result.total_errors}")
            logger.info(f"   Warnings: {validation_result.total_warnings}")
            
            # Log detailed validation report
            validation_report = static_validator.format_validation_report(validation_result)
            logger.debug(f"\n{validation_report}")
            
        except Exception as e:
            logger.warning(f"⚠️ Static validation failed: {str(e)}")
            # Continue even if validation fails - user will test anyway
            validation_result = None
        
        logger.info("\n📊 PHASE 3: TEST KIT GENERATION")
        logger.info("-" * 60)
        
        # Generate test kit
        try:
            test_kit = await test_kit_generator.generate_test_kit(
                issue_id=str(issue_number),
                solution=solution,
                repository_context=repo_context
            )
            
            logger.info(f"✅ Test kit generated: {test_kit.kit_id}")
            logger.info(f"   Size: {test_kit.size_bytes} bytes")
            logger.info(f"   Files: {test_kit.files_included}")
            logger.info(f"   Download: {test_kit.download_url}")
            
        except Exception as e:
            logger.error(f"❌ Test kit generation failed: {str(e)}")
            # Continue without test kit
            test_kit = None
        
        logger.info("\n" + "=" * 60)
        logger.info("NEXT-GEN PROCESSING COMPLETE")
        logger.info("=" * 60)
        
        # Build result
        result = {
            "status": "completed" if solution.get('success') else "needs_review",
            "issue_fix_id": issue_fix_id,
            "confidence": final_review.overall_score / 10.0,  # Convert 1-10 to 0.0-1.0
            
            # Solution details
            "operations": [
                {
                    "type": "modify_file",
                    "path": change['path'],
                    "content": change['content']
                }
                for change in solution.get('changes', [])
            ],
            
            "explanation": solution.get('explanation', ''),
            
            # Metrics
            "metrics": {
                "iterations": iterations,
                "review_score": final_review.overall_score,
                "completeness_score": final_review.completeness_score,
                "correctness_score": final_review.correctness_score,
                "quality_score": final_review.quality_score,
                "best_practices_score": final_review.best_practices_score,
                "static_validation_passed": validation_result.passed if validation_result else None,
                "static_validation_confidence": validation_result.confidence_score if validation_result else None,
                "total_errors": validation_result.total_errors if validation_result else 0,
                "total_warnings": validation_result.total_warnings if validation_result else 0,
                "tool_calls": solution.get('metrics', {}).get('tool_calls', 0),
                "api_calls": solution.get('metrics', {}).get('api_calls', 0),
                "retries": solution.get('metrics', {}).get('retries', 0),
            },
            
            # Warnings and feedback
            "warnings": solution.get('warnings', []),
            "review_feedback": final_review.feedback if final_review else "",
            
            # Test kit
            "test_kit": {
                "available": test_kit is not None,
                "download_url": test_kit.download_url if test_kit else None,
                "kit_id": test_kit.kit_id if test_kit else None,
                "size_bytes": test_kit.size_bytes if test_kit else 0,
            } if test_kit else None,
            
            # Instructions for user
            "user_instructions": self._generate_user_instructions(
                test_kit=test_kit,
                validation_result=validation_result,
                review=final_review
            ),
        }
        
        return result
    
    def _generate_user_instructions(
        self,
        test_kit,
        validation_result,
        review
    ) -> str:
        """Generate user-friendly instructions."""
        
        instructions = []
        
        instructions.append("🎉 Your issue fix is ready!")
        instructions.append("")
        
        # Review score
        if review:
            score = review.overall_score
            if score >= 8.0:
                instructions.append(f"✅ AI Review: EXCELLENT ({score:.1f}/10)")
            elif score >= 7.0:
                instructions.append(f"✅ AI Review: GOOD ({score:.1f}/10)")
            elif score >= 6.0:
                instructions.append(f"⚠️ AI Review: ACCEPTABLE ({score:.1f}/10)")
            else:
                instructions.append(f"❌ AI Review: NEEDS WORK ({score:.1f}/10)")
            instructions.append("")
        
        # Validation
        if validation_result:
            if validation_result.passed:
                instructions.append(f"✅ Static Validation: PASSED ({validation_result.confidence_score:.0%} confidence)")
            else:
                instructions.append(f"❌ Static Validation: FAILED ({validation_result.total_errors} errors)")
            instructions.append("")
        
        # Test kit instructions
        if test_kit:
            instructions.append("📦 Next Steps:")
            instructions.append(f"1. Download test kit: {test_kit.download_url}")
            instructions.append("2. Extract and run: ./run_tests.sh")
            instructions.append("3. Review results:")
            instructions.append("   ✅ If tests pass → Apply changes")
            instructions.append("   ❌ If tests fail → Provide feedback for regeneration")
        else:
            instructions.append("⚠️ Test kit generation failed. Please manually review the changes.")
        
        instructions.append("")
        instructions.append("💡 Tip: Always test in a separate branch first!")
        
        return "\n".join(instructions)
            
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
