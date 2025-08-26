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
from services.gemini_client import GeminiClient
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
        from services.enhanced_deepseek_client import deepseek_client
        health_status["services"]["deepseek"] = "configured" if deepseek_client.github_token else "not_configured"
    except Exception as e:
        health_status["services"]["deepseek"] = f"error: {str(e)}"
    
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
        
        # Initialize Gemini client
        gemini_client = GeminiClient()
        
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
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,  # Enable auto-reload for development
        log_level="info",
        access_log=True
    )
