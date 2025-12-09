"""
FastAPI server for python-worker HTTP endpoints.
Clean, scalable architecture focused on Q&A and code analysis.
"""
import os
from pathlib import Path

# Load environment variables FIRST before any service imports
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
    print(f"✅ Loaded environment from {env_path}")
except ImportError:
    print("⚠️ python-dotenv not installed, using system environment variables")
except Exception as e:
    print(f"⚠️ Error loading .env: {e}")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from typing import Optional, List

from api.attachments import router as attachments_router
from api.download_test_package import router as download_router
from api.clarification import router as clarification_router
from services.redis_client import redis_client
from services.qdrant_client import qdrant_client
from services.gemini_client import gemini_client
from services.github_api_client import GitHubClient
from services.tools.tool_registry import ToolRegistry
from services.tools.github.commit_tool import CommitTool, CommitDetailsTool
from services.tools.github.pr_tool import PullRequestTool, PullRequestDetailsTool
from services.tools.github.issue_tool import IssueTool, IssueDetailsTool
from services.tools.github.diff_tool import DiffTool, CompareTool
from services.gemini_function_caller import GeminiFunctionCaller
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
        except Exception as e:
            logger.warning(f"Redis disconnect error: {str(e)}")
        try:
            await qdrant_client.disconnect()
        except Exception as e:
            logger.warning(f"Qdrant disconnect error: {str(e)}")
        logger.info("🛑 API server shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="GitTLDR Python Worker API",
    description="Clean, scalable REST API for GitTLDR AI analysis services",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
from config.settings import get_settings

# Get settings instance
settings = get_settings()

# Get service URLs from settings
frontend_url = settings.frontend_url
node_worker_url = settings.node_worker_url

allowed_origins = [
    frontend_url,  # Production frontend
    "http://localhost:3000",      # Local development frontend
    "http://localhost:3001",      # Local node worker
]

# Add production node worker URL if provided
if node_worker_url:
    allowed_origins.append(node_worker_url)
    # Also add without trailing slash if it has one
    if node_worker_url.endswith('/'):
        allowed_origins.append(node_worker_url.rstrip('/'))

# Add development origins if in development mode
if settings.node_env == "development":
    allowed_origins.extend([
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attachments_router, prefix="/attachments", tags=["attachments"])
app.include_router(download_router, tags=["downloads"])
app.include_router(clarification_router, prefix="/clarification", tags=["clarification"])

# ===== DUPLICATE REQUEST PREVENTION =====
# Track active requests to prevent duplicate API calls within short timeframes
_active_requests = {}  # {request_hash: timestamp}
_request_lock = asyncio.Lock()

async def check_duplicate_request(repository_id: str, question: str) -> None:
    """
    Check if this exact request was made recently to prevent duplicates.
    Raises HTTPException 429 if duplicate detected within 90 seconds.
    """
    global _active_requests  # CRITICAL: Declare global to modify module-level dict
    
    request_hash = hashlib.md5(f"{repository_id}:{question.strip()}".encode()).hexdigest()
    
    async with _request_lock:
        now = datetime.now()
        
        # Check if this exact request was made recently (within 90 seconds)
        if request_hash in _active_requests:
            last_time = _active_requests[request_hash]
            time_diff = (now - last_time).total_seconds()
            
            if time_diff < 90:
                logger.warning(f"🚫 DUPLICATE REQUEST BLOCKED - Hash: {request_hash[:8]}, Time: {time_diff:.1f}s ago")
                logger.warning(f"🚫 Question: '{question[:80]}...'")
                raise HTTPException(
                    status_code=429,
                    detail=f"Duplicate request detected. This question is already being processed. Please wait {90 - int(time_diff)} more seconds."
                )
        
        # Mark this request timestamp
        _active_requests[request_hash] = now
        logger.info(f"✅ REQUEST ACCEPTED - Hash: {request_hash[:8]}, Question: '{question[:50]}...'")
        
        # Clean up old entries (older than 3 minutes) - modify in place
        cutoff = now - timedelta(minutes=3)
        old_count = len(_active_requests)
        # Use list() to avoid "dictionary changed size during iteration" error
        for h in list(_active_requests.keys()):
            if _active_requests[h] <= cutoff:
                del _active_requests[h]
        if len(_active_requests) < old_count:
            logger.debug(f"🧹 Cleaned up {old_count - len(_active_requests)} old request entries")

# ===== END DUPLICATE PREVENTION =====

# Health check cache to reduce Redis pings
health_cache = {"data": None, "timestamp": 0}
HEALTH_CACHE_TTL = 30  # Cache for 30 seconds

@app.get("/health")
async def health_check():
    """Health check endpoint with caching to reduce Redis operations."""
    try:
        current_time = time.time()
        
        # Return cached result if still valid
        if (health_cache["data"] and 
            (current_time - health_cache["timestamp"]) < HEALTH_CACHE_TTL):
            logger.debug("Returning cached health check result")
            return health_cache["data"]
        
        # Perform actual health check
        health_status = await perform_health_check()
        
        # Update cache
        health_cache["data"] = health_status
        health_cache["timestamp"] = current_time
        
        logger.debug("Performed fresh health check and cached result")
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "service": "python-worker-api",
            "status": "error",
            "error": str(e),
            "timestamp": time.time()
        }

async def perform_health_check():
    """Perform the actual health check operations."""
    """Health check endpoint."""
    return {"status": "healthy", "service": "python-worker"}

@app.get("/debug/gemini-status")
async def debug_gemini_status():
    """Debug endpoint to check Gemini client status."""
    try:
        from services.gemini_client import gemini_client
        status = gemini_client.get_rate_limit_status()
        return status
    except Exception as e:
        return {"error": str(e), "configured": False}

@app.post("/debug/reset-circuit-breakers")
async def debug_reset_circuit_breakers():
    """Debug endpoint to reset all circuit breakers."""
    try:
        from services.gemini_client import gemini_client
        gemini_client.reset_circuit_breakers()
        return {
            "message": "Circuit breakers reset successfully",
            "status": gemini_client.get_rate_limit_status()
        }
    except Exception as e:
        return {"error": str(e), "message": "Failed to reset circuit breakers"}

# Request/Response models
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

class MeetingQARequest(BaseModel):
    """Request model for meeting Q&A endpoint."""
    meeting_id: str
    question: str
    user_id: str = "anonymous"

class AnalyticsInsightsRequest(BaseModel):
    analytics: dict
    timeRange: str = "30d"

class AnalyticsInsightsResponse(BaseModel):
    status: str
    insights: List[str]
    generated_at: str

# Helper Functions for GitHub Integration

async def get_user_github_token(user_id: str) -> Optional[str]:
    """
    Get user's GitHub access token from database.
    
    Args:
        user_id: User ID
        
    Returns:
        GitHub access token or None if not found
    """
    from services.database_service import database_service
    
    try:
        user_info = await database_service.get_user_info(user_id)
        
        if user_info and user_info.get('github_token'):
            token = user_info['github_token']
            logger.info(f"Retrieved GitHub token for user {user_id}: ***{token[-4:]}")
            return token
        
        logger.warning(f"No GitHub token found for user {user_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error retrieving GitHub token: {str(e)}", exc_info=True)
        return None


async def get_repository_context(repository_id: str) -> dict:
    """
    Get repository context for Q&A.
    
    Args:
        repository_id: Repository ID
        
    Returns:
        Repository context dict
    """
    from services.database_service import database_service
    
    try:
        repo = await database_service.get_repository_status(repository_id)
        
        if not repo:
            raise HTTPException(status_code=404, detail=f"Repository {repository_id} not found")
        
        return {
            "id": repo.get('id'),
            "name": repo.get('name'),
            "full_name": repo.get('full_name'),
            "owner": repo.get('owner'),
            "description": repo.get('description'),
            "language": repo.get('language'),
            "stars": repo.get('stars', 0),
            "avatar_url": repo.get('avatar_url')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving repository context: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get repository context: {str(e)}")

# Q&A Endpoint

@app.post("/qna")
async def qna_endpoint(request: QnARequest):
    """
    Enhanced Q&A endpoint with GitHub integration and function calling.
    Supports dynamic GitHub data access through Gemini function calling.
    """
    try:
        logger.info(f"Processing Q&A for user {request.user_id}, repository {request.repository_id}")
        logger.info(f"Question: {request.question[:100]}...")
        
        # Get user's GitHub token
        user_github_token = await get_user_github_token(request.user_id)
        if user_github_token:
            logger.info(f"User has GitHub token - enabling GitHub tools")
        else:
            logger.info(f"No GitHub token found - proceeding with file-based analysis only")
        
        # Get repository context
        repo_context = await get_repository_context(request.repository_id)
        logger.info(f"Repository context: {repo_context.get('full_name') if repo_context else None}")
        
        # Initialize GitHub client with user's token
        github_client = GitHubClient(user_token=user_github_token)
        
        # Initialize tool registry
        tool_registry = ToolRegistry()
        
        # Register all GitHub tools if user has token
        if user_github_token:
            tool_registry.register_tool(CommitTool(github_client), category="commit")
            tool_registry.register_tool(CommitDetailsTool(github_client), category="commit")
            tool_registry.register_tool(PullRequestTool(github_client), category="pull_request")
            tool_registry.register_tool(PullRequestDetailsTool(github_client), category="pull_request")
            tool_registry.register_tool(IssueTool(github_client), category="issue")
            tool_registry.register_tool(IssueDetailsTool(github_client), category="issue")
            tool_registry.register_tool(DiffTool(github_client), category="code")
            tool_registry.register_tool(CompareTool(github_client), category="code")
            
            logger.info(f"Registered {tool_registry.get_tool_count()} GitHub tools")
            logger.info(f"Available tools: {', '.join(tool_registry.list_tool_names())}")
        
        # Check if question might benefit from GitHub tools
        github_keywords = ['commit', 'pr', 'pull request', 'issue', 'author', 'diff', 'change', 'merge', 'branch']
        uses_github_keywords = any(keyword in request.question.lower() for keyword in github_keywords)
        
        # Use function calling if GitHub tools are available and question suggests it
        if user_github_token and tool_registry.get_tool_count() > 0 and uses_github_keywords:
            logger.info("Using GitHub function calling for this question")
            
            # Use global gemini_client with multi-tier fallback
            function_caller = GeminiFunctionCaller(
                gemini_client=gemini_client,
                tool_registry=tool_registry,
                github_client=github_client
            )
            
            # Process question with function calling
            result = await function_caller.process_question(
                question=request.question,
                repository_context=repo_context
            )
            
            logger.info(f"Function calling complete: {result['conversation_turns']} turns, "
                       f"{len(result['tool_executions'])} tool calls, success={result.get('success', False)}")
            
            return {
                "status": "success",
                "result": {
                    "answer": result['answer'],
                    "tool_executions": result['tool_executions'],
                    "conversation_turns": result['conversation_turns'],
                    "github_data_used": len(result['tool_executions']) > 0,
                    "confidence": 0.95 if result.get('success') else 0.7,
                    "relevant_files": [],
                    "tags": ["github-integrated"] if result.get('success') else []
                }
            }
        
        else:
            # Fall back to traditional embedding-based Q&A
            logger.info("Using traditional embedding-based Q&A (no GitHub integration)")
            
            from processors.embedding import EmbeddingProcessor
            
            embedding_processor = EmbeddingProcessor()
            
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
        logger.error(f"Failed to process Q&A: {str(e)}", exc_info=True)
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

@app.post("/meeting-qa")
async def meeting_qa_endpoint(request: MeetingQARequest):
    """
    Meeting Q&A endpoint - processes questions about meeting content.
    """
    try:
        from processors.meeting_summarizer import MeetingProcessor
        
        logger.info(f"Processing meeting Q&A for meeting {request.meeting_id}")
        
        # Create meeting processor
        meeting_processor = MeetingProcessor()
        
        # Process the question about the meeting
        result = await meeting_processor.answer_meeting_question(
            meeting_id=request.meeting_id,
            question=request.question,
            user_id=request.user_id
        )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to process meeting Q&A: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract-action-items")
async def extract_action_items_endpoint(request: MeetingQARequest):
    """
    Extract action items from meeting content.
    """
    try:
        from processors.meeting_summarizer import MeetingProcessor
        
        logger.info(f"Extracting action items for meeting {request.meeting_id}")
        
        # Create meeting processor
        meeting_processor = MeetingProcessor()
        
        # Extract action items from meeting
        result = await meeting_processor.extract_action_items(
            meeting_id=request.meeting_id,
            user_id=request.user_id
        )
        
        return {
            "status": "success",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Failed to extract action items: {str(e)}")
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
async def perform_health_check():
    """Perform the actual health check operations."""
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
    
    return health_status

@app.get("/debug/qdrant-status")
async def debug_qdrant_status():
    """Debug endpoint to check Qdrant status and collections."""
    try:
        if not qdrant_client.client:
            await qdrant_client.connect()
        
        collections = qdrant_client.client.get_collections()
        
        result = {
            "qdrant_connected": True,
            "collections": []
        }
        
        for collection in collections.collections:
            collection_info = {
                "name": collection.name,
                "points_count": 0,
                "config": {}
            }
            
            try:
                info = qdrant_client.client.get_collection(collection.name)
                collection_info["points_count"] = info.points_count
                collection_info["config"] = {
                    "vector_size": info.config.params.vectors.size,
                    "distance": str(info.config.params.vectors.distance)
                }
            except Exception as e:
                collection_info["error"] = str(e)
            
            result["collections"].append(collection_info)
        
        return result
        
    except Exception as e:
        return {
            "qdrant_connected": False,
            "error": str(e),
            "collections": []
        }

@app.post("/debug/create-sample-meeting")
async def debug_create_sample_meeting():
    """Debug endpoint to create a sample meeting with segments in Qdrant."""
    try:
        # Connect to Qdrant if not connected
        if not qdrant_client.client:
            await qdrant_client.connect()
        
        # Sample meeting data
        meeting_id = "sample-meeting-123"
        
        sample_segments = [
            {
                "index": 0,
                "title": "Project Kickoff Discussion",
                "summary": "Team discussed the new project timeline and initial requirements",
                "text": "We need to start the new mobile app project. The deadline is in 3 months. John will lead the frontend development and Sarah will handle the backend. We should have a prototype ready by next month.",
                "startTime": 0,
                "endTime": 120
            },
            {
                "index": 1,
                "title": "Budget and Resources",
                "summary": "Reviewed budget allocation and team resource requirements",
                "text": "The budget for this project is $50,000. We need to hire two additional developers. Mike will handle the hiring process and should have candidates by Friday. The design team needs to finalize mockups by Wednesday.",
                "startTime": 120,
                "endTime": 240
            },
            {
                "index": 2,
                "title": "Action Items and Next Steps",
                "summary": "Defined clear action items and responsibilities for the team",
                "text": "Action items: 1) John to set up the development environment by tomorrow 2) Sarah to create database schema by Thursday 3) Team lead to schedule weekly check-ins 4) Marketing team to prepare launch strategy by end of week",
                "startTime": 240,
                "endTime": 360
            }
        ]
        
        # Store segments in Qdrant
        success = await qdrant_client.store_meeting_segments(meeting_id, sample_segments)
        
        if success:
            return {
                "status": "success",
                "message": f"Created sample meeting {meeting_id} with {len(sample_segments)} segments",
                "meeting_id": meeting_id,
                "segments_count": len(sample_segments)
            }
        else:
            return {
                "status": "error",
                "message": "Failed to store meeting segments"
            }
        
    except Exception as e:
        logger.error(f"Failed to create sample meeting: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/test-meeting-qa")
async def test_meeting_qa():
    """Test endpoint to create sample meeting data and test Q&A functionality."""
    try:
        # Create sample meeting data
        meeting_id = "test-meeting-123"
        
        # First create sample meeting in database (mock)
        sample_meeting_info = {
            "title": "Team Sprint Planning Meeting",
            "duration": "25:30",
            "id": meeting_id
        }
        
        # Create comprehensive sample segments
        sample_segments = [
            {
                "index": 0,
                "title": "Project Requirements Discussion",
                "summary": "The team discussed the new mobile app requirements including user authentication, real-time messaging, and payment integration.",
                "text": "We need to build a mobile app with user authentication. The app should support real-time messaging between users and integrate with Stripe for payments. John will lead the frontend development using React Native. Sarah will handle the backend API development. We need to complete the MVP within 3 months. The budget is $75,000.",
                "startTime": 0,
                "endTime": 180,
                "excerpt": "We need to build a mobile app with user authentication..."
            },
            {
                "index": 1,
                "title": "Timeline and Milestones",
                "summary": "Established project timeline with key milestones and deliverables over the next 3 months.",
                "text": "Our timeline is as follows: Week 1-2: Setup development environment and basic project structure. Week 3-4: Implement user authentication and basic UI. Week 5-8: Build core messaging features. Week 9-10: Payment integration and testing. Week 11-12: Final testing and deployment. Each milestone will have a demo session with stakeholders.",
                "startTime": 180,
                "endTime": 360,
                "excerpt": "Our timeline is as follows: Week 1-2: Setup development..."
            },
            {
                "index": 2,
                "title": "Action Items and Responsibilities",
                "summary": "Assigned specific action items to team members with clear deadlines and responsibilities.",
                "text": "Action items assigned: 1) John to set up React Native development environment by Friday 2) Sarah to design database schema and API endpoints by next Tuesday 3) Mike to prepare user stories and acceptance criteria by Wednesday 4) Lisa to create wireframes and UI mockups by Thursday 5) Team lead to schedule weekly sprint meetings every Monday at 10 AM",
                "startTime": 360,
                "endTime": 540,
                "excerpt": "Action items assigned: 1) John to set up React Native..."
            },
            {
                "index": 3,
                "title": "Budget and Resource Allocation",
                "summary": "Discussed budget breakdown and resource allocation for different aspects of the project.",
                "text": "Budget breakdown: $30,000 for development team salaries, $15,000 for infrastructure and hosting, $10,000 for third-party integrations and licenses, $10,000 for design and UX, $10,000 buffer for unexpected costs. We also discussed hiring two additional junior developers to support the project.",
                "startTime": 540,
                "endTime": 720,
                "excerpt": "Budget breakdown: $30,000 for development team salaries..."
            }
        ]
        
        # Store segments in Qdrant
        from services.qdrant_client import qdrant_client
        success = await qdrant_client.store_meeting_segments(meeting_id, sample_segments)
        
        if not success:
            return {
                "status": "error",
                "message": "Failed to store meeting segments in Qdrant"
            }
        
        # Test Q&A functionality
        from processors.meeting_summarizer import MeetingProcessor
        meeting_processor = MeetingProcessor()
        
        # Test questions
        test_questions = [
            "What is the project timeline?",
            "Who is responsible for the frontend development?",
            "What are the action items from this meeting?",
            "What is the budget for this project?"
        ]
        
        qa_results = []
        for question in test_questions:
            result = await meeting_processor.answer_meeting_question(
                meeting_id=meeting_id,
                question=question,
                user_id="test-user"
            )
            qa_results.append({
                "question": question,
                "answer": result.get("answer", "No answer"),
                "confidence": result.get("confidence", 0.0),
                "status": result.get("status", "unknown")
            })
        
        return {
            "status": "success",
            "message": f"Created test meeting {meeting_id} and tested Q&A",
            "meeting_id": meeting_id,
            "segments_stored": len(sample_segments),
            "qa_results": qa_results
        }
        
    except Exception as e:
        logger.error(f"Test meeting Q&A failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/api/generate-insights", response_model=AnalyticsInsightsResponse)
async def generate_analytics_insights(request: AnalyticsInsightsRequest):
    """Generate AI-powered insights from analytics data using Gemini."""
    try:
        logger.info(f"Generating AI insights for analytics data (timeRange: {request.timeRange})")
        
        # Use global gemini_client with multi-tier fallback
        # (already available from imports)
        
        # Prepare analytics summary for AI analysis
        analytics_summary = f"""
        Analytics Summary for {request.timeRange}:
        
        Overview:
        - Total Users: {request.analytics.get('overview', {}).get('totalUsers', 0)}
        - Total Repositories: {request.analytics.get('overview', {}).get('totalRepositories', 0)}
        - Total Meetings: {request.analytics.get('overview', {}).get('totalMeetings', 0)}
        - Total Questions: {request.analytics.get('overview', {}).get('totalQuestions', 0)}
        - Total Action Items: {request.analytics.get('overview', {}).get('totalActionItems', 0)}
        - Growth Rate: {request.analytics.get('overview', {}).get('growthRate', 0)}%
        
        Meeting Stats:
        - Average Duration: {request.analytics.get('meetingStats', {}).get('averageDuration', 0)} minutes
        - Completion Rate: {request.analytics.get('meetingStats', {}).get('completionRate', 0)}%
        
        File Stats:
        - Top Languages: {', '.join([lang.get('language', '') for lang in request.analytics.get('fileStats', {}).get('byLanguage', [])[:3]])}
        - Total Storage: {request.analytics.get('fileStats', {}).get('totalSizeGB', 0)} GB
        
        Q&A Stats:
        - Average Confidence: {request.analytics.get('qaStats', {}).get('averageConfidence', 0) * 100:.1f}%
        - Total Questions: {request.analytics.get('qaStats', {}).get('total', 0)}
        """
        
        # Create AI prompt for insights generation
        prompt = f"""
        You are an AI analytics expert analyzing software development team metrics. Based on the following analytics data, generate 4-6 actionable insights that would help a development team improve their productivity and collaboration.

        {analytics_summary}

        Please provide insights that are:
        1. Specific and actionable
        2. Based on the actual data provided
        3. Focused on productivity, collaboration, and code quality
        4. Written in a professional yet approachable tone
        5. Include specific metrics where relevant

        Format each insight as a concise sentence or two. Focus on trends, opportunities for improvement, and team performance indicators.
        """
        
        # Generate insights using Gemini
        try:
            response = await gemini_client.generate_content_async(prompt, max_tokens=500)
            
            if response and hasattr(response, 'text') and response.text:
                # Parse the response into individual insights
                insights_text = response.text.strip()
                
                # Split by common patterns and clean up
                insights = []
                for line in insights_text.split('\n'):
                    line = line.strip()
                    # Remove numbering, bullets, etc.
                    line = line.lstrip('1234567890.-• ')
                    if line and len(line) > 20:  # Filter out short/empty lines
                        insights.append(line)
                
                # Ensure we have at least some insights
                if not insights:
                    insights = [insights_text] if insights_text else []
                    
            else:
                logger.warning("No valid response from Gemini API")
                insights = generate_fallback_insights(request.analytics)
                
        except Exception as gemini_error:
            logger.error(f"Gemini API error: {str(gemini_error)}")
            insights = generate_fallback_insights(request.analytics)
        
        return AnalyticsInsightsResponse(
            status="success",
            insights=insights[:6],  # Limit to 6 insights
            generated_at=time.strftime("%Y-%m-%d %H:%M:%S")
        )
        
    except Exception as e:
        logger.error(f"Error generating analytics insights: {str(e)}")
        # Return fallback insights on any error
        fallback_insights = generate_fallback_insights(request.analytics)
        return AnalyticsInsightsResponse(
            status="partial",
            insights=fallback_insights,
            generated_at=time.strftime("%Y-%m-%d %H:%M:%S")
        )

def generate_fallback_insights(analytics: dict) -> List[str]:
    """Generate basic insights when AI is unavailable."""
    insights = []
    overview = analytics.get('overview', {})
    meeting_stats = analytics.get('meetingStats', {})
    file_stats = analytics.get('fileStats', {})
    qa_stats = analytics.get('qaStats', {})
    
    # Meeting insights
    if overview.get('totalMeetings', 0) > 0:
        completion_rate = meeting_stats.get('completionRate', 0)
        if completion_rate > 80:
            insights.append(f"Excellent meeting completion rate of {completion_rate:.1f}% shows strong team engagement and follow-through.")
        elif completion_rate > 60:
            insights.append(f"Meeting completion rate of {completion_rate:.1f}% is good, but there's room for improvement in follow-through.")
        else:
            insights.append(f"Meeting completion rate of {completion_rate:.1f}% suggests need for better meeting structure and action item tracking.")
            
        avg_duration = meeting_stats.get('averageDuration', 0)
        if avg_duration > 90:
            insights.append("Consider shorter, more focused meetings to improve efficiency and engagement.")
        elif avg_duration < 30:
            insights.append("Short meeting durations suggest efficient communication and good preparation.")
    
    # Code insights
    if file_stats.get('byLanguage'):
        top_language = file_stats['byLanguage'][0]
        insights.append(f"{top_language.get('language', 'Unknown')} dominance ({top_language.get('count', 0)} files) indicates consistent technology choices.")
    
    # Q&A insights
    if qa_stats.get('total', 0) > 0:
        confidence = qa_stats.get('averageConfidence', 0) * 100
        if confidence > 75:
            insights.append(f"High Q&A confidence score of {confidence:.1f}% demonstrates strong knowledge sharing and documentation.")
        else:
            insights.append(f"Q&A confidence score of {confidence:.1f}% suggests opportunities to improve documentation and knowledge base.")
    
    # Growth insights
    growth_rate = overview.get('growthRate', 0)
    if growth_rate > 10:
        insights.append(f"Strong growth rate of {growth_rate:.1f}% indicates healthy project expansion and team adoption.")
    elif growth_rate < -10:
        insights.append("Negative growth trend suggests need to review project direction and team engagement.")
    
    # Team insights
    total_users = overview.get('totalUsers', 0)
    if total_users > 1:
        insights.append(f"Team of {total_users} members shows collaborative development approach.")
    
    return insights[:6] if insights else ["Analytics data is being collected to provide meaningful insights."]

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
    # Disable reload in production (based on environment)
    is_development = settings.node_env == "development"
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8001,
        reload=is_development,  # Only enable auto-reload in development
        log_level="info",
        access_log=True
    )
