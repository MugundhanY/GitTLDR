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
from typing import Dict, Any, Optional
from datetime import datetime

from config.settings import get_settings
from utils.logger import setup_logging, get_logger, TaskLogger
from services.redis_client import redis_client
from services.gemini_client import gemini_client
from services.qdrant_client import qdrant_client
from processors.embedding import EmbeddingProcessor
from processors.summarization import SummarizationProcessor
from processors.file_processor import FileProcessor

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
        
        logger.info("All services connected")
        
    async def _process_loop(self) -> None:
        """Main processing loop."""
        logger.info("Starting task processing loop")
        
        while self.running:
            try:
                # Pop task from queue
                task_data = await redis_client.pop_task(timeout=30)
                
                if not task_data:
                    continue  # Timeout, continue loop
                    
                # Process task
                await self._process_task(task_data)
                
            except Exception as e:
                logger.error("Error in processing loop", error=str(e))
                await asyncio.sleep(5)  # Brief pause before retrying
                
    async def _process_task(self, task_data: Dict[str, Any]) -> None:
        """Process a single task."""
        task_id = task_data.get("id", "unknown")
        task_type = task_data.get("type", "unknown")
        
        with TaskLogger(task_id, task_type) as task_logger:
            try:
                # Update status to processing
                await redis_client.update_task_status(task_id, "processing")
                
                # Route to appropriate processor
                result = await self._route_task(task_data, task_logger)
                
                # Update status to completed
                await redis_client.update_task_status(
                    task_id, "completed", result                )
                
                task_logger.info("Task processed successfully")
                
            except Exception as e:
                # Update status to failed
                await redis_client.update_task_status(
                    task_id, "failed", {"error": str(e)}
                )
                
                task_logger.error("Task processing failed", error=str(e))
                raise
    
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
            
        elif task_type == "summarize_commit":
            return await self.processors["summarization"].summarize_commit(task_data, logger)
            
        elif task_type == "answer_question":
            return await self.processors["embedding"].answer_question(task_data, logger)
            
        elif task_type == "process_meeting":
            return await self.processors["summarization"].process_meeting(task_data, logger)
            
        else:
            raise ValueError(f"Unknown task type: {task_type}")
            
    async def _cleanup(self) -> None:
        """Cleanup resources."""
        logger.info("Cleaning up resources")
        
        try:
            await redis_client.disconnect()
        except Exception as e:
            logger.error("Error disconnecting from Redis", error=str(e))
            
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
