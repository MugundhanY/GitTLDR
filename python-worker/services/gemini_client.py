"""
Gemini API client for AI-powered processing.
"""
import asyncio
import time
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import tiktoken
from sentence_transformers import SentenceTransformer

from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class RateLimitManager:
    """Manages rate limiting, retries, and circuit breaker functionality for API calls."""
    
    def __init__(self):
        self.consecutive_failures = 0
        self.last_failure_time = None
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.max_consecutive_failures = 5
        
        # Rate limiting detection patterns
        self.rate_limit_indicators = [
            "429",  # Too Many Requests
            "quota",
            "rate limit",
            "rate_limit_exceeded",
            "quota_exceeded",
            "requests per minute",
            "requests per second",
            "exceeded quota",
            "quota exceeded",
            "rate limited",
            "429 Too Many Requests",
            "RATE_LIMIT_EXCEEDED",
            "Resource has been exhausted"
        ]
        
        # Service unavailable indicators
        self.service_unavailable_indicators = [
            "503",  # Service Unavailable
            "Service Unavailable",
            "server_error",
            "internal_server_error",
            "temporarily unavailable",
            "service temporarily unavailable",
            "502",  # Bad Gateway
            "Bad Gateway",
            "504",  # Gateway Timeout
            "Gateway Timeout"
        ]
        
        # Temporary error indicators
        self.temporary_error_indicators = [
            "timeout",
            "connection",
            "network",
            "temporary",
            "transient",
            "deadline exceeded",
            "connection reset",
            "connection refused"
        ]
    
    def is_circuit_breaker_open(self) -> bool:
        """Check if circuit breaker is open (should skip API calls)."""
        if self.consecutive_failures < self.max_consecutive_failures:
            return False
            
        if self.last_failure_time is None:
            return False
            
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure < self.circuit_breaker_timeout
    
    def is_rate_limited(self, error_str: str) -> bool:
        """Check if error indicates rate limiting."""
        error_lower = error_str.lower()
        return any(indicator.lower() in error_lower for indicator in self.rate_limit_indicators)
    
    def is_service_unavailable(self, error_str: str) -> bool:
        """Check if error indicates service unavailability."""
        error_lower = error_str.lower()
        return any(indicator.lower() in error_lower for indicator in self.service_unavailable_indicators)
    
    def is_temporary_error(self, error_str: str) -> bool:
        """Check if error is temporary and worth retrying."""
        error_lower = error_str.lower()
        return any(indicator.lower() in error_lower for indicator in self.temporary_error_indicators)
    
    def should_retry(self, error_str: str, attempt: int, max_retries: int) -> bool:
        """Determine if we should retry based on error type and attempt count."""
        if attempt >= max_retries:
            return False
            
        return (self.is_rate_limited(error_str) or 
                self.is_service_unavailable(error_str) or 
                self.is_temporary_error(error_str))
    
    def get_retry_delay(self, error_str: str, attempt: int, base_delay: int = 1) -> int:
        """Calculate retry delay based on error type and attempt count."""
        if self.is_rate_limited(error_str):
            # Longer delays for rate limiting
            return base_delay * (3 ** attempt)  # 1s, 3s, 9s, 27s...
        elif self.is_service_unavailable(error_str):
            # Moderate delays for service issues
            return base_delay * (2 ** attempt)  # 1s, 2s, 4s, 8s...
        else:
            # Standard exponential backoff for other errors
            return base_delay * (2 ** attempt)
    
    def record_success(self):
        """Record successful API call."""
        self.consecutive_failures = 0
        self.last_failure_time = None
    
    def record_failure(self):
        """Record failed API call."""
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
    
    def get_circuit_breaker_status(self) -> Dict[str, Any]:
        """Get current circuit breaker status for logging."""
        return {
            "consecutive_failures": self.consecutive_failures,
            "circuit_open": self.is_circuit_breaker_open(),
            "time_since_last_failure": time.time() - self.last_failure_time if self.last_failure_time else None
        }


class GeminiClient:
    """Gemini API client for AI-powered processing with sentence-transformers embeddings."""
    
    def __init__(self):
        self.settings = None
        self._configured = False
        self._initialized = False
        
        # Initialize models (will be set up on first use)
        self.text_model = None
        self.embedding_model = None  # Will be SentenceTransformer model
        
        # Token encoder for counting (will be set up on first use)
        self.encoder = None
        # Safety settings (will be set up on first use)
        self.safety_settings = None
        
        # Rate limiting manager
        self.rate_limit_manager = RateLimitManager()
        
    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        self._ensure_configured()
        return len(self.encoder.encode(text))
        
    def chunk_text(self, text: str, max_tokens: int = 8000) -> List[str]:
        """Split text into chunks that fit within token limits."""
        self._ensure_configured()
        tokens = self.encoder.encode(text)
        chunks = []
        for i in range(0, len(tokens), max_tokens):
            chunk_tokens = tokens[i:i + max_tokens]
            chunk_text = self.encoder.decode(chunk_tokens)
            chunks.append(chunk_text)
            
        return chunks
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using sentence-transformers."""
        self._ensure_configured()
        
        try:
            # Truncate text if too long (sentence-transformers has different limits)
            # Most sentence-transformers models have a max sequence length of 512 tokens
            token_count = self.count_tokens(text)
            max_tokens = 500  # Conservative limit for sentence-transformers
            
            if token_count > max_tokens:
                chunks = self.chunk_text(text, max_tokens)
                text = chunks[0]  # Use first chunk
                logger.warning(
                    "Text truncated for embedding",
                    original_tokens=token_count,
                    chunks=len(chunks)
                )
            
            # Generate embedding using sentence-transformers
            embedding = self.embedding_model.encode(text, convert_to_tensor=False)
              # Convert to list if it's a numpy array
            if hasattr(embedding, 'tolist'):
                embedding = embedding.tolist()
            
            logger.debug("Generated embedding", text_length=len(text), embedding_dim=len(embedding))
            return embedding
            
        except Exception as e:
            logger.error("Failed to generate embedding", error=str(e))
            raise

    async def generate_summary(self, text: str, context: str = "code repository") -> str:
        """Generate summary of text with comprehensive retry logic and rate limiting."""
        self._ensure_configured()
        
        # Check circuit breaker
        if self.rate_limit_manager.is_circuit_breaker_open():
            circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
            logger.warning("Circuit breaker is open, skipping API call", **circuit_status)
            raise Exception("Circuit breaker is open due to consecutive failures")
        
        max_retries = 5  # Increased for better resilience
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Prepare prompt
                prompt = self._build_summary_prompt(text, context)
                
                # Generate summary
                response = await self.text_model.generate_content_async(
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        top_p=0.8,
                        top_k=40,
                        max_output_tokens=1000,
                    )
                )
                
                summary = response.text.strip()
                
                # Record success
                self.rate_limit_manager.record_success()
                
                logger.debug("Generated summary", length=len(summary), attempt=attempt + 1)
                return summary
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    # Log appropriate message based on error type
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        logger.warning(
                            f"Rate limit detected, retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            error=error_str[:100]
                        )
                    elif self.rate_limit_manager.is_service_unavailable(error_str):
                        logger.warning(
                            f"Service unavailable, retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            error=error_str[:100]
                        )
                    elif self.rate_limit_manager.is_temporary_error(error_str):
                        logger.warning(
                            f"Temporary error, retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            error=error_str[:100]                    )
                    
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    # Not retryable or max retries reached
                    circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
                    logger.error(
                        "Failed to generate summary - not retryable error", 
                        error=error_str,
                        attempt=attempt + 1,
                        **circuit_status
                    )
                    raise e
        
        # This shouldn't be reached, but just in case
        raise Exception("Maximum retries exceeded")    
    async def answer_question(self, question: str, context: str, files_content: List[str]) -> Dict[str, Any]:
        """Answer question based on repository context with comprehensive retry logic."""
        self._ensure_configured()
        
        # Check circuit breaker
        if self.rate_limit_manager.is_circuit_breaker_open():
            circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
            logger.warning("Circuit breaker is open, skipping Q&A API call", **circuit_status)
            raise Exception("Circuit breaker is open due to consecutive failures")
        
        max_retries = 5  # Increased for better resilience
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Prepare context from files
                combined_context = self._prepare_qa_context(context, files_content)
                
                # Build Q&A prompt
                prompt = self._build_qa_prompt(question, combined_context)
                
                # Generate answer
                response = await self.text_model.generate_content_async(
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        top_p=0.9,
                        max_output_tokens=2000,
                    )
                )
                
                answer = response.text.strip()
                
                # Extract confidence score (simple heuristic)
                confidence = self._calculate_confidence(answer, combined_context)
                
                # Record success
                self.rate_limit_manager.record_success()
                
                logger.debug("Generated answer", question_length=len(question), answer_length=len(answer), attempt=attempt + 1)
                
                return {
                    "answer": answer,
                    "confidence": confidence,
                    "context_used": len(files_content)
                }
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    # Log appropriate message based on error type
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        logger.warning(
                            f"Rate limit detected in Q&A, retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            error=error_str[:100]
                        )
                    elif self.rate_limit_manager.is_service_unavailable(error_str):
                        logger.warning(
                            f"Service unavailable in Q&A, retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            error=error_str[:100]
                        )
                    elif self.rate_limit_manager.is_temporary_error(error_str):
                        logger.warning(
                            f"Temporary error in Q&A, retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            error=error_str[:100]
                        )
                    
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    # Not retryable or max retries reached
                    circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
                    logger.error(
                        "Failed to answer question - not retryable error", 
                        error=error_str,
                        attempt=attempt + 1,
                        **circuit_status
                    )
                    raise e
        
        # This shouldn't be reached, but just in case
        raise Exception("Maximum retries exceeded")
            
    async def generate_batch_summaries(self, texts_with_context: List[Dict[str, str]], 
                                      batch_delay: float = 0.5) -> List[Dict[str, Any]]:
        """
        Generate summaries for multiple texts with intelligent rate limiting.
        
        Args:
            texts_with_context: List of dicts with 'text' and 'context' keys
            batch_delay: Base delay between API calls (will be adjusted based on rate limiting)
        
        Returns:
            List of results with 'summary', 'success', and 'error' keys
        """
        results = []
        adaptive_delay = batch_delay
        
        for i, item in enumerate(texts_with_context):
            try:
                # Check circuit breaker before each call
                if self.rate_limit_manager.is_circuit_breaker_open():
                    circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
                    logger.warning(
                        f"Circuit breaker open, skipping batch item {i+1}/{len(texts_with_context)}", 
                        **circuit_status
                    )
                    results.append({
                        'summary': None,
                        'success': False,
                        'error': 'Circuit breaker open - too many consecutive failures'
                    })
                    continue
                
                # Add adaptive delay between requests
                if i > 0:
                    await asyncio.sleep(adaptive_delay)
                
                # Generate summary
                summary = await self.generate_summary(
                    item.get('text', ''), 
                    item.get('context', 'code')
                )
                
                results.append({
                    'summary': summary,
                    'success': True,
                    'error': None
                })
                
                # Reset adaptive delay on success
                adaptive_delay = batch_delay
                
                logger.debug(f"Batch summary {i+1}/{len(texts_with_context)} completed successfully")
                
            except Exception as e:
                error_str = str(e)
                
                # Increase adaptive delay if we hit rate limits
                if self.rate_limit_manager.is_rate_limited(error_str):
                    adaptive_delay = min(adaptive_delay * 2, 30)  # Cap at 30 seconds
                    logger.warning(f"Rate limit detected, increasing batch delay to {adaptive_delay}s")
                elif self.rate_limit_manager.is_service_unavailable(error_str):
                    adaptive_delay = min(adaptive_delay * 1.5, 15)  # Cap at 15 seconds
                    logger.warning(f"Service issues detected, increasing batch delay to {adaptive_delay}s")
                
                results.append({
                    'summary': None,
                    'success': False,
                    'error': error_str
                })
                
                logger.error(f"Batch summary {i+1}/{len(texts_with_context)} failed", error=error_str)
        
        # Log batch completion stats
        successful = sum(1 for r in results if r['success'])
        failed = len(results) - successful
        
        logger.info(
            f"Batch summarization completed", 
            total=len(results),
            successful=successful,
            failed=failed,
            success_rate=f"{(successful/len(results)*100):.1f}%" if results else "0%"
        )
        
        return results

    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limiting status for monitoring."""
        return {
            "circuit_breaker_status": self.rate_limit_manager.get_circuit_breaker_status(),
            "model_name": "gemini-2.0-flash-lite",
            "configured": self._configured,
            "initialized": self._initialized
        }

    def _build_summary_prompt(self, text: str, context: str) -> str:
        """Build prompt for summarization."""
        return f"""
You are an expert code analyst. Please provide a concise, informative summary of the following {context} content.

Focus on:
- Main purpose and functionality
- Key components or modules
- Important patterns or architectures
- Notable features or technologies used

Content to summarize:
{text}

Provide a clear, structured summary in 2-3 paragraphs:
"""

    def _build_qa_prompt(self, question: str, context: str) -> str:
        """Build prompt for Q&A."""
        return f"""
You are an expert code analyst helping developers understand a repository. 
Answer the following question based on the provided repository context.

Be specific, accurate, and reference relevant files or code sections when possible.
If you're unsure about something, say so rather than guessing.

Repository Context:
{context}

Question: {question}

Answer:
"""

    def _prepare_qa_context(self, repo_info: str, files_content: List[str]) -> str:
        """Prepare context for Q&A from repository files."""
        context_parts = [f"Repository Information:\n{repo_info}"]
        
        for i, content in enumerate(files_content):
            # Truncate very long files
            if len(content) > 5000:
                content = content[:5000] + "\n... [truncated]"
            context_parts.append(f"File {i+1}:\n{content}")
            
        return "\n\n".join(context_parts)
        
    def _calculate_confidence(self, answer: str, context: str) -> float:
        """Calculate confidence score for answer (simple heuristic)."""
        # Simple heuristic based on answer length and context overlap
        if "I'm not sure" in answer or "I don't know" in answer:
            return 0.3        
        elif len(answer) > 200 and any(word in context.lower() for word in answer.lower().split()):
            return 0.8
        elif len(answer) > 100:
            return 0.6
        else:
            return 0.4
            
    def _ensure_configured(self):
        """Ensure the client is configured before use."""
        if not self._initialized:
            self.settings = get_settings()
            self.encoder = tiktoken.get_encoding("cl100k_base")
            self.safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
            
            # Initialize sentence-transformers embedding model
            logger.info("Loading paraphrase-mpnet-base-v2 embedding model...")
            self.embedding_model = SentenceTransformer('sentence-transformers/paraphrase-mpnet-base-v2')
            logger.info("Embedding model loaded successfully")
            
            self._initialized = True
            
        if not self._configured:
            if self.settings.gemini_api_key == "your-gemini-api-key":
                raise ValueError("Please set a valid GEMINI_API_KEY in your environment variables")
            
            genai.configure(api_key=self.settings.gemini_api_key)
            # Use Gemini 2.0 Flash Lite which is faster and has better rate limits
            self.text_model = genai.GenerativeModel('gemini-2.0-flash-lite')
            logger.info("Initialized Gemini 2.0 Flash Lite model for text generation")
            self._configured = True


# Global Gemini client instance
gemini_client = GeminiClient()
