"""
Lightweight AI Thinking Service - Optimized architecture with minimal Redis dependencies.
Only uses Redis for file caching, not for real-time streaming or task management.
"""
import asyncio
from typing import Dict, Any, List, Optional
from fastapi.responses import StreamingResponse
from services.database_service import database_service
from services.enhanced_deepseek_client import EnhancedDeepSeekClient
from services.gemini_client import gemini_client
from services.redis_client import redis_client
from utils.logger import get_logger
import json

logger = get_logger(__name__)


class LightweightThinkingService:
    """
    Optimized thinking service with minimal Redis dependencies.
    
    Architecture:
    - Direct database access for file metadata (with optional Redis caching)
    - Direct B2 storage access for file content (with optional Redis caching)
    - Direct HTTP streaming (no Redis pub/sub needed)
    - No task queuing (direct API response)
    """
    
    def __init__(self):
        self.deepseek_client = EnhancedDeepSeekClient()
        self.use_redis_cache = True  # Can be disabled if needed
    
    async def process_lightweight_thinking(
        self, 
        repository_id: str, 
        question: str,
        attachments: List[Dict[str, Any]] = None,
        stream: bool = True
    ) -> StreamingResponse:
        """
        Process thinking request with lightweight architecture.
        Uses database + B2 storage directly, with optional Redis caching.
        """
        
        async def generate_thinking_stream():
            try:
                # Step 1: Get repository files (database first, Redis cache optional)
                repository_files = await self._get_repository_files_lightweight(repository_id)
                
                if not repository_files:
                    yield self._format_step({
                        "id": "error-1",
                        "type": "error", 
                        "content": "No repository files found for analysis.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.0
                    })
                    return
                
                # Step 2: Build context and select relevant files
                repository_context = self._build_minimal_context(repository_files)
                relevant_files = self._select_relevant_files(repository_files, question)
                
                # Step 3: Load file contents (B2 direct, with optional Redis cache)
                files_content = await self._load_files_content_lightweight(
                    repository_id, relevant_files[:6]
                )
                
                if not files_content:
                    yield self._format_step({
                        "id": "error-2",
                        "type": "error",
                        "content": "No file contents could be loaded for analysis.",
                        "timestamp": int(asyncio.get_event_loop().time() * 1000),
                        "confidence": 0.0
                    })
                    return
                
                # Step 4: Direct AI thinking stream (no Redis involved)
                repository_name = self._extract_repo_name(repository_files)
                enhanced_question = question
                
                if attachments:
                    attachment_context = await self._process_attachments_lightweight(attachments)
                    if attachment_context:
                        enhanced_question = f"{question}\n{attachment_context}"
                
                # Direct AI streaming - no Redis, no queuing, just pure stream
                step_counter = 1
                
                try:
                    logger.info("Starting direct DeepSeek R1 thinking stream")
                    
                    async for ai_step in self.deepseek_client.think_and_analyze(
                        question=enhanced_question,
                        repository_context=repository_context,
                        files_content=files_content,
                        repository_name=repository_name,
                        stream=stream
                    ):
                        # Pass through AI steps directly - no Redis processing
                        ai_step["id"] = f"thinking-{step_counter}"
                        step_counter += 1
                        yield self._format_step(ai_step)
                        
                except Exception as deepseek_error:
                    logger.warning(f"DeepSeek failed, falling back to Gemini: {str(deepseek_error)}")
                    
                    # Fallback to Gemini (still no Redis involved)
                    try:
                        gemini_result = await gemini_client.answer_question(
                            question=enhanced_question,
                            context=repository_context,
                            files_content=files_content
                        )
                        
                        yield self._format_step({
                            "id": f"thinking-{step_counter}",
                            "type": "analysis",
                            "content": gemini_result.get("answer", "Analysis completed"),
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": gemini_result.get("confidence", 0.8),
                            "metadata": {
                                "source": "gemini_fallback",
                                "reasoning_steps": gemini_result.get("reasoning_steps", [])
                            }
                        })
                        
                    except Exception as gemini_error:
                        logger.error(f"Both DeepSeek and Gemini failed: {str(gemini_error)}")
                        yield self._format_step({
                            "id": f"error-{step_counter}",
                            "type": "error",
                            "content": f"Analysis failed: {str(gemini_error)}",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000),
                            "confidence": 0.0
                        })
                
            except Exception as e:
                logger.error(f"Lightweight thinking failed: {str(e)}")
                yield self._format_step({
                    "id": "error-final",
                    "type": "error",
                    "content": f"Thinking process failed: {str(e)}",
                    "timestamp": int(asyncio.get_event_loop().time() * 1000),
                    "confidence": 0.0
                })

        if stream:
            return StreamingResponse(
                generate_thinking_stream(),
                media_type="text/plain",
                headers={"Cache-Control": "no-cache"}
            )
        else:
            # Non-streaming response
            steps = []
            async for step in generate_thinking_stream():
                steps.append(step)
            return {"steps": steps}
    
    async def _get_repository_files_lightweight(self, repository_id: str) -> List[Dict[str, Any]]:
        """
        Get repository files using database first, with optional Redis caching.
        This is much lighter than the current Redis-heavy approach.
        """
        try:
            # Try Redis cache first if enabled
            if self.use_redis_cache:
                try:
                    # Check if Redis is available and has data
                    await redis_client.ping()
                    
                    cache_key = f"repo_files_cache:{repository_id}"
                    cached_files = await redis_client.get(cache_key)
                    
                    if cached_files:
                        logger.debug(f"Using cached repository files for {repository_id}")
                        return json.loads(cached_files)
                        
                except Exception as redis_error:
                    logger.debug(f"Redis cache miss or error: {str(redis_error)}")
            
            # Get files from database (primary source)
            logger.info(f"Loading repository files from database for {repository_id}")
            files = await database_service.get_repository_files(repository_id)
            
            # Cache in Redis for future use if enabled
            if self.use_redis_cache and files:
                try:
                    cache_key = f"repo_files_cache:{repository_id}"
                    await redis_client.set(
                        cache_key, 
                        json.dumps(files), 
                        ex=3600  # Cache for 1 hour
                    )
                    logger.debug(f"Cached repository files for {repository_id}")
                except Exception as cache_error:
                    logger.debug(f"Failed to cache files: {str(cache_error)}")
            
            return files
            
        except Exception as e:
            logger.error(f"Failed to get repository files: {str(e)}")
            return []
    
    async def _load_files_content_lightweight(
        self, 
        repository_id: str, 
        relevant_files: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Load file contents using B2 direct access with optional Redis caching.
        Much lighter than the current complex Redis-based approach.
        """
        files_content = []
        
        for file_info in relevant_files:
            try:
                file_path = file_info['path']
                content = None
                
                # Try Redis cache first if enabled
                if self.use_redis_cache:
                    try:
                        await redis_client.ping()
                        cache_key = f"file_content_cache:{repository_id}:{file_path}"
                        content = await redis_client.get(cache_key)
                        
                        if content:
                            logger.debug(f"Using cached content for {file_path}")
                            files_content.append(f"=== {file_path} ===\n{content}\n")
                            continue
                            
                    except Exception as redis_error:
                        logger.debug(f"Redis content cache miss: {str(redis_error)}")
                
                # Load from database/B2 storage (primary source)
                files_with_content = await database_service.load_file_contents(
                    [file_info], 
                    {"categories": ["general"], "priority": "medium"}
                )
                
                if files_with_content and files_with_content[0].get('content'):
                    content = files_with_content[0]['content']
                    files_content.append(f"=== {file_path} ===\n{content}\n")
                    
                    # Cache content if enabled
                    if self.use_redis_cache and content:
                        try:
                            cache_key = f"file_content_cache:{repository_id}:{file_path}"
                            await redis_client.set(
                                cache_key, 
                                content, 
                                ex=1800  # Cache for 30 minutes
                            )
                            logger.debug(f"Cached content for {file_path}")
                        except Exception as cache_error:
                            logger.debug(f"Failed to cache content: {str(cache_error)}")
                
            except Exception as e:
                logger.warning(f"Failed to load content for {file_info.get('path', 'unknown')}: {str(e)}")
                continue
        
        return files_content
    
    async def _process_attachments_lightweight(self, attachments: List[Dict[str, Any]]) -> str:
        """Process attachments without Redis dependencies."""
        if not attachments:
            return ""
        
        attachment_texts = []
        for attachment in attachments:
            try:
                if attachment.get('type') == 'text' and attachment.get('content'):
                    attachment_texts.append(f"Attachment: {attachment['content']}")
                elif attachment.get('file_content'):
                    attachment_texts.append(f"File: {attachment.get('name', 'Unknown')}\n{attachment['file_content']}")
            except Exception as e:
                logger.warning(f"Failed to process attachment: {str(e)}")
                continue
        
        return "\n\n".join(attachment_texts) if attachment_texts else ""
    
    def _build_minimal_context(self, repository_files: List[Dict[str, Any]]) -> str:
        """Build minimal repository context without heavy processing."""
        if not repository_files:
            return "No repository files available."
        
        file_count = len(repository_files)
        languages = list(set(f.get('language', 'unknown') for f in repository_files[:20]))
        languages = [lang for lang in languages if lang and lang != 'unknown']
        
        context = f"Repository with {file_count} files"
        if languages:
            context += f" (Languages: {', '.join(languages[:5])})"
        
        return context
    
    def _select_relevant_files(self, files: List[Dict[str, Any]], question: str) -> List[Dict[str, Any]]:
        """Simple file selection based on question keywords."""
        question_lower = question.lower()
        
        # Simple scoring based on filename relevance
        scored_files = []
        for file_info in files:
            score = 0
            name = file_info.get('name', '').lower()
            path = file_info.get('path', '').lower()
            
            # Boost important files
            if any(keyword in name for keyword in ['readme', 'main', 'index', 'app']):
                score += 10
            
            # Boost files that match question keywords
            question_words = question_lower.split()
            for word in question_words:
                if len(word) > 3:  # Skip short words
                    if word in name or word in path:
                        score += 5
            
            scored_files.append((score, file_info))
        
        # Sort by score and return top files
        scored_files.sort(reverse=True, key=lambda x: x[0])
        return [file_info for score, file_info in scored_files]
    
    def _extract_repo_name(self, repository_files: List[Dict[str, Any]]) -> str:
        """Extract repository name from file paths."""
        if not repository_files:
            return "Unknown Repository"
        
        # Try to extract from common patterns
        for file_info in repository_files:
            path = file_info.get('path', '')
            if 'package.json' in path.lower() or 'readme' in path.lower():
                parts = path.split('/')
                if len(parts) > 1:
                    return parts[0] or "Repository"
        
        return "Repository"
    
    def _format_step(self, step_data: Dict[str, Any]) -> str:
        """Format thinking step for streaming response."""
        return f"data: {json.dumps(step_data)}\n\n"


# Global lightweight thinking service instance
lightweight_thinking_service = LightweightThinkingService()