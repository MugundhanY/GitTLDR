"""
FastAPI server for python-worker HTTP endpoints.
Clean, scalable architecture focused on AI thinking and analysis.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import json
from contextlib import asynccontextmanager
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from typing import Optional, List

from api.thinking_context import get_thinking_context, ThinkingContextRequest, ThinkingContextResponse
from api.pure_thinking import pure_thinking_service
from api.comprehensive_thinking import comprehensive_thinking_service
from api.attachments import router as attachments_router
from api.lightweight_thinking import lightweight_thinking_service
from services.redis_client import redis_client
from services.qdrant_client import qdrant_client
from utils.logger import setup_logging, get_logger

# Setup logging
setup_logging()
logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown."""
    # Startup
    logger.info("Starting python-worker API server")
    try:
        # Connect to services with timeout and error handling
        logger.info("Connecting to Redis...")
        try:
            await redis_client.connect()
            logger.info("✅ Redis connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {str(e)} - continuing without Redis")
        
        logger.info("Connecting to Qdrant...")
        try:
            await qdrant_client.connect()
            logger.info("✅ Qdrant connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Qdrant connection failed: {str(e)} - continuing without Qdrant")
        
        logger.info("🚀 API server startup complete")
        yield
    finally:
        # Shutdown
        logger.info("Shutting down python-worker API server")
        try:
            await redis_client.disconnect()
        except:
            pass

# Create FastAPI app
app = FastAPI(
    title="GitTLDR Python Worker API",
    description="Clean, scalable REST API for GitTLDR AI analysis services",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attachments_router, prefix="/attachments", tags=["attachments"])

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "python-worker"}

@app.post("/get-thinking-context", response_model=ThinkingContextResponse)
async def get_thinking_context_endpoint(request: ThinkingContextRequest):
    """
    Get file context and analysis for AI thinking mode.
    This endpoint integrates with FileRetrievalService and SmartContextBuilder.
    """
    try:
        return await get_thinking_context(request)
    except Exception as e:
        logger.error(f"Failed to get thinking context: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class PureThinkingRequest(BaseModel):
    """Request model for pure thinking endpoint."""
    repository_id: str
    question: str
    attachments: list = []
    stream: bool = True

class ComprehensiveThinkingRequest(BaseModel):
    """Request model for comprehensive thinking endpoint."""
    repository_id: str
    question: str
    attachments: list = []
    stream: bool = True

# Add new request models
class QnARequest(BaseModel):
    """Request model for Q&A processing."""
    repository_id: str
    question: str
    user_id: str
    question_id: Optional[str] = None
    attachments: List = []

class TaskStatusRequest(BaseModel):
    """Request model for task status checking."""
    task_id: str

class TaskStatusResponse(BaseModel):
    """Response model for task status."""
    task_id: str
    status: str
    progress: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None

@app.post("/pure-thinking")
async def pure_thinking_endpoint(request: PureThinkingRequest):
    """
    Pure AI thinking endpoint - shows ONLY real DeepSeek R1 reasoning steps.
    No dummy steps, just actual chain of thought from the AI model.
    """
    try:
        logger.info(f"Starting pure AI thinking for repository {request.repository_id}")
        return await pure_thinking_service.process_pure_thinking(
            repository_id=request.repository_id,
            question=request.question,
            attachments=request.attachments,
            stream=request.stream
        )
    except Exception as e:
        logger.error(f"Failed to process pure thinking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/comprehensive-thinking")
async def comprehensive_thinking_endpoint(request: ComprehensiveThinkingRequest):
    """
    Comprehensive AI thinking endpoint - complete thinking process with file retrieval + AI reasoning.
    Includes setup steps, file context building, and full DeepSeek R1 chain of thought.
    """
    try:
        logger.info(f"Starting comprehensive AI thinking for repository {request.repository_id}")
        return await comprehensive_thinking_service.process_thinking_request(
            repository_id=request.repository_id,
            question=request.question,
            attachments=request.attachments,
            stream=request.stream
        )
    except Exception as e:
        logger.error(f"Failed to process comprehensive thinking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lightweight-thinking")
async def lightweight_thinking_endpoint(request: PureThinkingRequest):
    """
    Lightweight AI thinking endpoint - optimized architecture with minimal Redis dependencies.
    
    This endpoint demonstrates how the thinking mode can work with:
    - Database-first file access (Redis caching optional)
    - Direct B2 storage access (Redis caching optional) 
    - Direct HTTP streaming (no Redis pub/sub needed)
    - No task queuing overhead
    
    Redis is only used for performance caching, not core functionality.
    """
    try:
        logger.info(f"Starting lightweight AI thinking for repository {request.repository_id}")
        return await lightweight_thinking_service.process_lightweight_thinking(
            repository_id=request.repository_id,
            question=request.question,
            attachments=request.attachments,
            stream=request.stream
        )
    except Exception as e:
        logger.error(f"Failed to process lightweight thinking: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/thinking/architecture-comparison")
async def thinking_architecture_comparison():
    """
    Compare different thinking architectures to show Redis usage optimization.
    """
    comparison = {
        "current_architecture": {
            "description": "Current comprehensive thinking with heavy Redis usage",
            "redis_usage": [
                "File metadata storage and retrieval",
                "Repository status tracking", 
                "Task status management",
                "File content caching",
                "Cross-repository file searching"
            ],
            "performance": "Good caching, but complex Redis dependencies",
            "maintenance": "High - requires Redis to be available and consistent"
        },
        "lightweight_architecture": {
            "description": "Optimized thinking with minimal Redis dependencies",
            "redis_usage": [
                "Optional file metadata caching",
                "Optional file content caching"
            ],
            "primary_sources": [
                "PostgreSQL database for file metadata", 
                "B2 storage for file content",
                "Direct HTTP streaming for real-time updates"
            ],
            "performance": "Excellent - database is fast, Redis only for performance boost",
            "maintenance": "Low - works without Redis, gracefully uses Redis when available"
        },
        "redis_free_architecture": {
            "description": "Pure database + B2 storage approach",
            "redis_usage": [],
            "primary_sources": [
                "PostgreSQL database for everything",
                "B2 storage for file content",
                "Direct HTTP streaming"
            ],
            "performance": "Good - modern databases are very fast",
            "maintenance": "Minimal - only database and B2 storage needed"
        },
        "recommendation": {
            "best_approach": "lightweight_architecture",
            "reasons": [
                "Works without Redis (graceful degradation)",
                "Uses Redis only for performance benefits",
                "Simpler architecture and debugging",
                "Database is the source of truth",
                "Easy to scale and maintain"
            ],
            "redis_role": "Optional performance enhancement, not core dependency"
        }
    }
    
    return comparison

@app.post("/qna")
async def qna_endpoint(request: QnARequest):
    """
    Traditional Q&A endpoint - processes questions and stores results.
    This provides an alternative to the Redis queue system for direct API access.
    """
    try:
        from processors.embedding import EmbeddingProcessor
        
        logger.info(f"Processing Q&A for repository {request.repository_id}")
        
        # Create embedding processor
        embedding_processor = EmbeddingProcessor()
        
        # Process the question
        result = await embedding_processor.answer_question(
            task_data={
                "questionId": request.question_id or f"api_{request.repository_id}_{int(time.time())}",
                "repositoryId": request.repository_id,
                "userId": request.user_id,
                "question": request.question,
                "attachments": request.attachments
            },
            logger=logger
        )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to process Q&A: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task-status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get the status of a task by task ID.
    This provides compatibility with the existing task tracking system.
    """
    try:
        # Try to get task status from Redis
        status_data = await redis_client.hgetall(f"job:{task_id}")
        
        if not status_data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Parse result if it exists
        result = None
        if status_data.get('result'):
            try:
                import json
                result = json.loads(status_data['result'])
            except:
                result = status_data['result']  # Keep as string if parsing fails
        
        return TaskStatusResponse(
            task_id=task_id,
            status=status_data.get('status', 'unknown'),
            progress=status_data.get('progress'),
            result=result,
            error=status_data.get('error')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get task status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/repository/process")
async def process_repository_endpoint(request: dict):
    """
    Process repository endpoint - alternative to Redis queue for repository processing.
    """
    try:
        from processors.file_processor import FileProcessor
        
        repository_id = request.get("repository_id")
        action = request.get("action", "full_analysis")
        
        if not repository_id:
            raise HTTPException(status_code=400, detail="repository_id is required")
        
        logger.info(f"Processing repository {repository_id} with action {action}")
        
        # Create file processor
        file_processor = FileProcessor()
        
        # Process based on action type
        if action == "full_analysis":
            result = await file_processor.process_full_repository(
                task_data={
                    "repositoryId": repository_id,
                    "userId": request.get("user_id"),
                    "repoUrl": request.get("repo_url")
                },
                logger=logger
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")
        
        return {
            "status": "success",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process repository: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add WebSocket support for real-time updates
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                # Remove dead connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws/thinking/{repository_id}")
async def thinking_websocket(websocket: WebSocket, repository_id: str):
    """
    WebSocket endpoint for real-time thinking updates.
    Alternative to HTTP streaming for better connection management.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            logger.info(f"Received WebSocket message for {repository_id}: {data}")
            
            # Echo back for now - can be extended for interactive thinking
            await manager.send_personal_message(f"Processing: {data}", websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected for repository {repository_id}")

@app.get("/repositories/{repository_id}/status")
async def get_repository_status(repository_id: str):
    """
    Get comprehensive repository processing status.
    """
    try:
        from services.database_service import database_service
        
        # Get repository status from database
        repo_status = await database_service.get_repository_status(repository_id)
        
        if not repo_status:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        # Get additional metrics from Redis if available
        redis_status = await redis_client.hgetall(f"repository_status:{repository_id}")
        
        return {
            "repository_id": repository_id,
            "status": repo_status,
            "redis_status": redis_status,
            "timestamp": time.time()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get repository status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/repositories/{repository_id}/files")
async def get_repository_files(repository_id: str, limit: int = 100):
    """
    Get repository files metadata.
    """
    try:
        from services.database_service import database_service
        
        files = await database_service.get_repository_files(repository_id)
        
        # Limit results
        if limit and len(files) > limit:
            files = files[:limit]
        
        return {
            "repository_id": repository_id,
            "file_count": len(files),
            "files": files
        }
        
    except Exception as e:
        logger.error(f"Failed to get repository files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with service status."""
    health_status = {
        "service": "python-worker-api",
        "status": "healthy",
        "timestamp": time.time(),
        "services": {}
    }
    
    # Check Redis connection
    try:
        await redis_client.ping()
        health_status["services"]["redis"] = "connected"
    except Exception as e:
        health_status["services"]["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Qdrant connection
    try:
        qdrant_healthy = await qdrant_client.check_connection()
        health_status["services"]["qdrant"] = "connected" if qdrant_healthy else "disconnected"
        if not qdrant_healthy:
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["qdrant"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check DeepSeek client
    try:
        from services.deepseek_client import deepseek_client
        health_status["services"]["deepseek"] = "configured" if deepseek_client.github_token else "not_configured"
    except Exception as e:
        health_status["services"]["deepseek"] = f"error: {str(e)}"
    
    return health_status

if __name__ == "__main__":
    """Main entry point for running the API server."""
    import uvicorn
    
    # Get settings for configuration
    from config.settings import get_settings
    settings = get_settings()
    
    # Configure uvicorn
    logger.info("Starting GitTLDR Python Worker API Server")
    logger.info(f"Server will be available at: http://localhost:8001")
    logger.info(f"API documentation: http://localhost:8001/docs")
    logger.info(f"Health check: http://localhost:8001/health")
    
    # Run the server
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,  # Enable auto-reload for development
        log_level="info",
        access_log=True
    )
