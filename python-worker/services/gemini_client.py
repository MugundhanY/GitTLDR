"""
Gemini API client for AI-powered processing with API key rotation and enhanced rate limiting.
"""
import asyncio
import time
import random
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import tiktoken
from sentence_transformers import SentenceTransformer

from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class APIKeyManager:
    """Manages multiple API keys with rotation and rate limiting tracking."""
    
    def __init__(self, api_keys: List[str]):
        self.api_keys = api_keys
        self.current_index = 0
        self.key_status = {}  # Track status of each key
        self.key_last_error_time = {}  # Track when each key last had an error
        self.key_consecutive_failures = {}  # Track consecutive failures per key
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.max_consecutive_failures = 3  # Lower threshold per key
        
        # Initialize status for all keys
        for key in api_keys:
            self.key_status[key] = "active"
            self.key_last_error_time[key] = None
            self.key_consecutive_failures[key] = 0
            
        logger.info(f"Initialized API key manager with {len(api_keys)} keys")
    
    def get_active_key(self) -> Optional[str]:
        """Get the next active API key for use."""
        if not self.api_keys:
            return None
            
        # Find the next available key
        attempts = 0
        while attempts < len(self.api_keys):
            key = self.api_keys[self.current_index]
            
            if self._is_key_available(key):
                logger.debug(f"Using API key index {self.current_index}")
                return key
            
            # Move to next key
            self.current_index = (self.current_index + 1) % len(self.api_keys)
            attempts += 1
        
        # All keys are unavailable
        logger.warning("All API keys are currently unavailable")
        return None
    
    def _is_key_available(self, key: str) -> bool:
        """Check if a specific key is available for use."""
        if self.key_status[key] == "disabled":
            return False
            
        # Check circuit breaker
        consecutive_failures = self.key_consecutive_failures[key]
        if consecutive_failures >= self.max_consecutive_failures:
            last_error_time = self.key_last_error_time[key]
            if last_error_time:
                time_since_error = time.time() - last_error_time
                if time_since_error < self.circuit_breaker_timeout:
                    return False
                else:
                    # Reset circuit breaker
                    logger.info(f"Resetting circuit breaker for API key index {self.api_keys.index(key)}")
                    self.key_consecutive_failures[key] = 0
                    self.key_status[key] = "active"
        
        return True
    
    def record_success(self, key: str):
        """Record successful API call for a key."""
        if key in self.key_consecutive_failures:
            self.key_consecutive_failures[key] = 0
            self.key_status[key] = "active"
            
    def record_failure(self, key: str, error_str: str):
        """Record failed API call for a key."""
        self.key_consecutive_failures[key] = self.key_consecutive_failures.get(key, 0) + 1
        self.key_last_error_time[key] = time.time()
        
        # Check if key should be temporarily disabled
        if self.key_consecutive_failures[key] >= self.max_consecutive_failures:
            self.key_status[key] = "circuit_breaker"
            logger.warning(f"API key index {self.api_keys.index(key)} disabled due to consecutive failures")
    
    def rotate_to_next_key(self):
        """Manually rotate to the next key."""
        self.current_index = (self.current_index + 1) % len(self.api_keys)
        
    def get_status(self) -> Dict[str, Any]:
        """Get status of all API keys."""
        status = {}
        for i, key in enumerate(self.api_keys):
            status[f"key_{i}"] = {
                "status": self.key_status[key],
                "consecutive_failures": self.key_consecutive_failures[key],
                "time_since_last_error": time.time() - self.key_last_error_time[key] 
                    if self.key_last_error_time[key] else None
            }
        return status


class RateLimitManager:
    """Manages rate limiting, retries, and circuit breaker functionality for API calls."""
    
    def __init__(self):
        self.consecutive_failures = 0
        self.last_failure_time = None
        self.circuit_breaker_timeout = 180  # 3 minutes (reduced from 5)
        self.max_consecutive_failures = 3  # Reduced from 5 to be less aggressive
        
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
        # Reset circuit breaker completely on success
        was_open = self.is_circuit_breaker_open()
        self.consecutive_failures = 0
        self.last_failure_time = None
        
        if was_open:
            logger.info("Circuit breaker reset due to successful API call")
    
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
    
    def reset_circuit_breaker(self):
        """Manually reset the circuit breaker."""
        self.consecutive_failures = 0
        self.last_failure_time = None
        logger.info("Circuit breaker manually reset")


class GeminiClient:
    """Gemini API client with API key rotation, enhanced rate limiting, and embedding choice."""
    
    def __init__(self):
        self.settings = None
        self._configured = False
        self._initialized = False
        
        # API key management
        self.api_key_manager = None
        
        # Initialize models (will be set up on first use)
        self.text_model = None
        self.embedding_model = None  # Local SentenceTransformer model
        
        # Token encoder for counting (will be set up on first use)
        self.encoder = None
        # Safety settings (will be set up on first use)
        self.safety_settings = None
        
        # Rate limiting manager
        self.rate_limit_manager = RateLimitManager()
        
        # Embedding cache to reduce API calls
        self.embedding_cache = {}
        self.cache_max_size = 1000
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
        """Generate embedding for text using Gemini API or local model based on configuration."""
        self._ensure_configured()
        
        # Check if we should use Gemini embeddings
        if self.settings.use_gemini_embeddings:
            return await self._generate_gemini_embedding(text)
        else:
            return await self._generate_local_embedding(text)
    
    async def _generate_gemini_embedding(self, text: str) -> List[float]:
        """Generate embedding using Gemini API with rotation and rate limiting."""
        # Check cache first
        text_hash = hash(text)
        if text_hash in self.embedding_cache:
            logger.debug("Using cached embedding")
            return self.embedding_cache[text_hash]
        
        # Check circuit breaker
        if self.rate_limit_manager.is_circuit_breaker_open():
            logger.warning("Circuit breaker open for embeddings, falling back to local model")
            return await self._generate_local_embedding(text)
        
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Get active API key
                current_key = self.api_key_manager.get_active_key()
                if not current_key:
                    logger.warning("No active API keys available, falling back to local embeddings")
                    return await self._generate_local_embedding(text)
                
                # Configure Gemini with current key
                genai.configure(api_key=current_key)
                
                # Truncate text if too long for Gemini embeddings
                token_count = self.count_tokens(text)
                max_tokens = 2000  # Gemini embedding token limit
                
                if token_count > max_tokens:
                    chunks = self.chunk_text(text, max_tokens)
                    text = chunks[0]  # Use first chunk
                    logger.warning(
                        "Text truncated for Gemini embedding",
                        original_tokens=token_count,
                        chunks=len(chunks)
                    )
                
                # Generate embedding using Gemini API
                result = await asyncio.to_thread(
                    genai.embed_content,
                    model="models/text-embedding-004",  # Latest Gemini embedding model
                    content=text,
                    task_type="semantic_similarity"
                )
                
                embedding = result['embedding']
                
                # Record success
                self.api_key_manager.record_success(current_key)
                self.rate_limit_manager.record_success()
                
                # Cache the result
                if len(self.embedding_cache) < self.cache_max_size:
                    self.embedding_cache[text_hash] = embedding
                
                logger.debug("Generated Gemini embedding", text_length=len(text), embedding_dim=len(embedding))
                return embedding
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure for current key
                current_key = self.api_key_manager.get_active_key()
                if current_key:
                    self.api_key_manager.record_failure(current_key, error_str)
                
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry with a different key
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    # Rotate to next key on rate limit
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        self.api_key_manager.rotate_to_next_key()
                        logger.warning(f"Rate limit on Gemini embedding, rotating key and retrying in {retry_delay}s")
                    else:
                        logger.warning(f"Gemini embedding error, retrying in {retry_delay}s: {error_str[:100]}")
                    
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    logger.warning(f"Gemini embedding failed, falling back to local model: {error_str}")
                    return await self._generate_local_embedding(text)
        
        # All retries exhausted, fall back to local
        logger.warning("All Gemini embedding retries exhausted, using local model")
        return await self._generate_local_embedding(text)
    
    async def _generate_local_embedding(self, text: str) -> List[float]:
        """Generate embedding using local sentence-transformers model."""
        try:
            if self.embedding_model is None:
                # Fallback: Generate a simple hash-based embedding
                logger.warning("Using fallback embedding method - sentence-transformers not available")
                import hashlib
                # Create a deterministic embedding from text hash
                text_hash = hashlib.sha256(text.encode()).hexdigest()
                # Convert hash to float values (simple but deterministic)
                embedding = [float(int(text_hash[i:i+2], 16)) / 255.0 for i in range(0, min(len(text_hash), 768), 2)]
                # Pad to standard embedding size
                while len(embedding) < 384:
                    embedding.append(0.0)
                return embedding[:384]  # Return fixed size
            
            # Truncate text if too long (sentence-transformers has different limits)
            # Most sentence-transformers models have a max sequence length of 512 tokens
            token_count = self.count_tokens(text)
            max_tokens = 500  # Conservative limit for sentence-transformers
            
            if token_count > max_tokens:
                chunks = self.chunk_text(text, max_tokens)
                text = chunks[0]  # Use first chunk
                logger.warning(
                    "Text truncated for local embedding",
                    original_tokens=token_count,
                    chunks=len(chunks)
                )
            
            # Generate embedding using sentence-transformers
            embedding = await asyncio.to_thread(
                self.embedding_model.encode,
                text,
                convert_to_tensor=False
            )
              
            # Convert to list if it's a numpy array
            if hasattr(embedding, 'tolist'):
                embedding = embedding.tolist()
            
            logger.debug("Generated local embedding", text_length=len(text), embedding_dim=len(embedding))
            return embedding
            
        except Exception as e:
            logger.error("Failed to generate local embedding", error=str(e))
            # Emergency fallback
            logger.warning("Using emergency fallback embedding method")
            import hashlib
            text_hash = hashlib.sha256(text.encode()).hexdigest()
            embedding = [float(int(text_hash[i:i+2], 16)) / 255.0 for i in range(0, min(len(text_hash), 768), 2)]
            while len(embedding) < 384:
                embedding.append(0.0)
            return embedding[:384]

    async def generate_summary(self, text: str, context: str = "code repository") -> str:
        """Generate summary of text with API key rotation and comprehensive retry logic."""
        self._ensure_configured()
        
        # Check circuit breaker and auto-reset if timeout has passed
        if self.rate_limit_manager.is_circuit_breaker_open():
            circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
            time_since_failure = circuit_status.get("time_since_last_failure", 0)
            
            # Auto-reset if enough time has passed
            if time_since_failure and time_since_failure > self.rate_limit_manager.circuit_breaker_timeout:
                logger.info(f"Auto-resetting circuit breaker after {time_since_failure:.1f} seconds")
                self.rate_limit_manager.reset_circuit_breaker()
            else:
                logger.warning("Circuit breaker is open, skipping API call", **circuit_status)
                raise Exception("Circuit breaker is open due to consecutive failures")
        
        max_retries = 5  # Increased for better resilience
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Get active API key
                current_key = self.api_key_manager.get_active_key()
                if not current_key:
                    raise Exception("No active API keys available for summary generation")
                
                # Configure Gemini with current key
                genai.configure(api_key=current_key)
                model = genai.GenerativeModel('gemini-2.0-flash-lite')
                
                # Prepare prompt
                prompt = self._build_summary_prompt(text, context)
                
                # Generate summary (sync call in async context)
                response = await asyncio.to_thread(
                    model.generate_content,
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
                
                # Record success for the current key
                self.api_key_manager.record_success(current_key)
                self.rate_limit_manager.record_success()
                
                logger.debug("Generated summary", length=len(summary), attempt=attempt + 1, key_index=self.api_key_manager.current_index)
                return summary
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure for current key
                current_key = self.api_key_manager.get_active_key()
                if current_key:
                    self.api_key_manager.record_failure(current_key, error_str)
                
                # Record failure for rate limiting
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    # Log appropriate message based on error type
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        # Rotate to next key on rate limit
                        self.api_key_manager.rotate_to_next_key()
                        logger.warning(
                            f"Rate limit detected, rotating to next API key and retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            new_key_index=self.api_key_manager.current_index,
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
                            error=error_str[:100]
                        )
                    
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    # Not retryable or max retries reached
                    circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
                    key_status = self.api_key_manager.get_status()
                    logger.error(
                        "Failed to generate summary - not retryable error", 
                        error=error_str,
                        attempt=attempt + 1,
                        circuit_status=circuit_status,
                        key_status=key_status
                    )
                    raise e
          
        # This shouldn't be reached, but just in case
        raise Exception("Maximum retries exceeded")
    
    async def answer_question(self, question: str, context: str, files_content: List[str]) -> Dict[str, Any]:
        """Answer question based on repository context with API key rotation and comprehensive retry logic."""
        self._ensure_configured()
        
        # Check circuit breaker and auto-reset if timeout has passed
        if self.rate_limit_manager.is_circuit_breaker_open():
            circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
            time_since_failure = circuit_status.get("time_since_last_failure", 0)
            
            # Auto-reset if enough time has passed
            if time_since_failure and time_since_failure > self.rate_limit_manager.circuit_breaker_timeout:
                logger.info(f"Auto-resetting circuit breaker after {time_since_failure:.1f} seconds")
                self.rate_limit_manager.reset_circuit_breaker()
            else:
                logger.warning("Circuit breaker is open, skipping Q&A API call", **circuit_status)
                raise Exception("Circuit breaker is open due to consecutive failures")
        
        max_retries = 5  # Increased for better resilience
        base_delay = 1
          # Debug logging for Q&A context
        logger.info(f"Q&A Debug - Files content count: {len(files_content)}")
        attachment_count = 0
        repo_file_count = 0
        for i, content in enumerate(files_content):
            content_preview = content[:200] + "..." if len(content) > 200 else content
            is_attachment = "attachment/" in content or "Attachment:" in content or "🔴 USER-PROVIDED" in content
            if is_attachment:
                attachment_count += 1
                logger.info(f"Q&A Debug - ATTACHMENT {attachment_count} preview: {content_preview}")
            else:
                repo_file_count += 1
                logger.info(f"Q&A Debug - Repository file {repo_file_count} preview: {content_preview}")
        logger.info(f"Q&A Context Summary - Repository files: {repo_file_count}, Attachments: {attachment_count}")
        
        for attempt in range(max_retries):
            try:
                # Get active API key
                current_key = self.api_key_manager.get_active_key()
                if not current_key:
                    raise Exception("No active API keys available for Q&A")
                
                # Configure Gemini with current key
                genai.configure(api_key=current_key)
                model = genai.GenerativeModel('gemini-2.0-flash-lite')
                
                # Check if this is a commit-focused question and optimize context
                is_commit_focused = "🔄 COMMIT ANALYSIS RESULTS:" in context or any("🔄 COMMIT ANALYSIS" in fc for fc in files_content)
                
                if is_commit_focused:
                    logger.info("🔄 GEMINI COMMIT OPTIMIZATION: Detected commit-focused question, optimizing context")
                    
                    # Separate commit data from regular files
                    commit_files = []
                    other_files = []
                    
                    for content in files_content:
                        if "🔄 COMMIT ANALYSIS" in content or "COMMIT " in content or "Message:" in content:
                            commit_files.append(content)
                        else:
                            other_files.append(content)
                    
                    # For commit questions, severely limit non-commit content
                    MAX_COMMIT_CONTEXT = 3000  # Small context for commit questions
                    commit_content_size = sum(len(fc) for fc in commit_files)
                    
                    logger.info(f"🔄 COMMIT OPTIMIZATION: Found {len(commit_files)} commit files ({commit_content_size} chars), {len(other_files)} other files")
                    
                    if commit_content_size + sum(len(fc) for fc in other_files) > MAX_COMMIT_CONTEXT:
                        # Keep all commit files, severely reduce other files
                        remaining_budget = max(0, MAX_COMMIT_CONTEXT - commit_content_size)
                        
                        if remaining_budget > 500:  # Only include other files if there's meaningful space
                            optimized_other_files = []
                            current_size = 0
                            
                            for content in other_files:
                                if current_size + len(content) <= remaining_budget:
                                    optimized_other_files.append(content)
                                    current_size += len(content)
                                else:
                                    # Heavily truncate to fit
                                    remaining_space = remaining_budget - current_size
                                    if remaining_space > 200:  # Only if meaningful space left
                                        truncated = content[:remaining_space-50] + "\n... [truncated for commit focus]"
                                        optimized_other_files.append(truncated)
                                    break
                            
                            files_content = commit_files + optimized_other_files
                            logger.info(f"🔄 COMMIT OPTIMIZATION: Kept {len(commit_files)} commit files + {len(optimized_other_files)} truncated files")
                        else:
                            # Remove all non-commit files
                            files_content = commit_files
                            logger.info(f"🔄 COMMIT OPTIMIZATION: Removed all non-commit files, kept only {len(commit_files)} commit files")
                
                # Prepare context from files
                combined_context = self._prepare_qa_context(context, files_content)
                
                # Debug logging for combined context
                context_preview = combined_context[:500] + "..." if len(combined_context) > 500 else combined_context
                logger.info(f"Q&A Debug - Combined context preview: {context_preview}")
                
                # Build Q&A prompt
                prompt = self._build_qa_prompt(question, combined_context)                # Generate answer with adaptive token limits based on context size
                context_size = len(combined_context)
                if context_size > 15000:  # Very large context
                    max_tokens = 6000  # More tokens for complex questions
                elif context_size > 8000:  # Large context  
                    max_tokens = 5000  # Medium token limit
                else:  # Normal context
                    max_tokens = 4000  # Standard limit
                
                logger.info(f"Using {max_tokens} max tokens for context size: {context_size} chars")
                
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.2,
                        top_p=0.9,
                        max_output_tokens=max_tokens,  # Adaptive token limit
                    )
                )
                answer = response.text.strip()
                
                # Enhanced truncation detection and handling
                is_likely_truncated = False
                truncation_reasons = []
                
                # Check if response was likely truncated
                if len(answer) >= max_tokens * 0.95:  # Within 5% of token limit
                    is_likely_truncated = True
                    truncation_reasons.append(f"Length near token limit ({len(answer)}/{max_tokens * 4} chars)")
                
                if not answer.endswith(('.', '!', '?', '```', ')', ']', '}', '"')):
                    is_likely_truncated = True
                    truncation_reasons.append("No proper sentence ending")
                
                # Check for abrupt cuts in common patterns
                if answer.endswith(('*', '-', ':', ',', ';', 'and', 'or', 'but', 'with', 'to', 'for')):
                    is_likely_truncated = True
                    truncation_reasons.append("Ends with incomplete word/phrase")
                
                if is_likely_truncated:
                    logger.warning(f"Response likely truncated: {', '.join(truncation_reasons)}")
                    
                    # Add helpful truncation notice
                    if not answer.endswith('\n'):
                        answer += '\n'
                    answer += '\n[Note: This response may have been truncated due to length. If you need more details about specific aspects, please ask a more focused question.]'
                else:
                    logger.info(f"Response appears complete ({len(answer)} chars, proper ending)")
                
                # Extract confidence score (simple heuristic)
                confidence = self._calculate_confidence(answer, combined_context)
                
                # Record success for the current key
                self.api_key_manager.record_success(current_key)
                self.rate_limit_manager.record_success()
                
                logger.debug("Generated answer", question_length=len(question), answer_length=len(answer), 
                           attempt=attempt + 1, key_index=self.api_key_manager.current_index)
                
                return {
                    "answer": answer,
                    "confidence": confidence,
                    "context_used": len(files_content)
                }
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure for current key
                current_key = self.api_key_manager.get_active_key()
                if current_key:
                    self.api_key_manager.record_failure(current_key, error_str)
                
                # Record failure for rate limiting
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    # Log appropriate message based on error type
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        # Rotate to next key on rate limit
                        self.api_key_manager.rotate_to_next_key()
                        logger.warning(
                            f"Rate limit detected in Q&A, rotating to next API key and retrying in {retry_delay}s", 
                            attempt=attempt + 1, 
                            max_retries=max_retries,
                            new_key_index=self.api_key_manager.current_index,
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
                    key_status = self.api_key_manager.get_status()
                    logger.error(
                        "Failed to answer question - not retryable error", 
                        error=error_str,
                        attempt=attempt + 1,
                        circuit_status=circuit_status,
                        key_status=key_status
                    )
                    raise e
        
        # This shouldn't be reached, but just in case
        raise Exception("Maximum retries exceeded")
            
    async def generate_batch_summaries(self, texts_with_context: List[Dict[str, str]], 
                                      batch_delay: float = 0.5) -> List[Dict[str, Any]]:
        """
        Generate summaries for multiple texts with intelligent rate limiting and API key rotation.
        
        Args:
            texts_with_context: List of dicts with 'text' and 'context' keys
            batch_delay: Base delay between API calls (will be adjusted based on rate limiting)
        
        Returns:
            List of results with 'summary', 'success', and 'error' keys
        """
        results = []
        adaptive_delay = batch_delay
        consecutive_rate_limits = 0
        
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
                
                # Check if we have available API keys
                if not self.api_key_manager.get_active_key():
                    logger.warning(f"No active API keys, skipping batch item {i+1}/{len(texts_with_context)}")
                    results.append({
                        'summary': None,
                        'success': False,
                        'error': 'No active API keys available'
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
                
                # Reset adaptive delay and consecutive rate limits on success
                adaptive_delay = batch_delay
                consecutive_rate_limits = 0
                
                logger.debug(f"Batch summary {i+1}/{len(texts_with_context)} completed successfully")
                
            except Exception as e:
                error_str = str(e)
                
                # Increase adaptive delay if we hit rate limits
                if self.rate_limit_manager.is_rate_limited(error_str):
                    consecutive_rate_limits += 1
                    adaptive_delay = min(adaptive_delay * (1.5 ** consecutive_rate_limits), 60)  # Cap at 60 seconds
                    logger.warning(f"Rate limit detected, increasing batch delay to {adaptive_delay}s (consecutive: {consecutive_rate_limits})")
                    
                    # If we have multiple consecutive rate limits, rotate key proactively
                    if consecutive_rate_limits >= 2:
                        self.api_key_manager.rotate_to_next_key()
                        logger.info(f"Rotating to next API key due to consecutive rate limits (new index: {self.api_key_manager.current_index})")
                        
                elif self.rate_limit_manager.is_service_unavailable(error_str):
                    adaptive_delay = min(adaptive_delay * 1.5, 30)  # Cap at 30 seconds
                    logger.warning(f"Service issues detected, increasing batch delay to {adaptive_delay}s")
                else:
                    # Reset consecutive rate limits for other errors
                    consecutive_rate_limits = 0
                
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
            success_rate=f"{(successful/len(results)*100):.1f}%" if results else "0%",
            final_delay=adaptive_delay,
            api_key_status=self.api_key_manager.get_status() if self.api_key_manager else None
        )
        
        return results

    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get current rate limiting status for monitoring."""
        status = {
            "circuit_breaker_status": self.rate_limit_manager.get_circuit_breaker_status(),            
            "model_name": "gemini-2.0-flash-lite",
            "configured": self._configured,
            "initialized": self._initialized,
            "embedding_mode": "gemini" if self.settings and self.settings.use_gemini_embeddings else "local",
            "embedding_cache_size": len(self.embedding_cache) if hasattr(self, 'embedding_cache') else 0
        }
        
        if self.api_key_manager:
            status["api_keys"] = {
                "total_keys": len(self.api_key_manager.api_keys),
                "current_key_index": self.api_key_manager.current_index,
                "key_status": self.api_key_manager.get_status()
            }
        
        return status
    
    def reset_circuit_breakers(self):
        """Reset all circuit breakers to clear previous failures."""
        self.rate_limit_manager.reset_circuit_breaker()
        if self.api_key_manager:
            for key in self.api_key_manager.api_keys:
                self.api_key_manager.key_consecutive_failures[key] = 0
                self.api_key_manager.key_last_error_time[key] = None
                self.api_key_manager.key_status[key] = "active"
        logger.info("All circuit breakers have been reset")

    def _build_summary_prompt(self, text: str, context: str) -> str:
        """Build prompt for summarization."""
        if context == "git commit":
            return f"""
You are an expert code analyst. Provide a very concise summary of this git commit.

Commit information:
{text}

Requirements:
- Write a single, clear sentence (max 2 sentences)
- Focus on the main change or feature
- Use present tense
- Avoid mentioning file names unless crucial
- Keep it under 100 characters when possible

Example format: "Adds user authentication with JWT tokens" or "Fixes database connection timeout issue"

Summary:
"""
        else:
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

    async def generate_chain_of_thought(self, question: str, context: str, files_content: List[str]) -> Dict[str, Any]:
        """Generate step-by-step chain-of-thought reasoning similar to DeepSeek R1."""
        self._ensure_configured()
        
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Prepare context from files
                combined_context = self._prepare_qa_context(context, files_content)
                
                # Build chain-of-thought prompt
                prompt = self._build_chain_of_thought_prompt(question, combined_context)
                
                # Generate reasoning
                response = await asyncio.to_thread(
                    self.text_model.generate_content,
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        top_p=0.9,
                        max_output_tokens=3000,
                    )
                )
                reasoning = response.text.strip()
                confidence = self._calculate_confidence(reasoning, combined_context)
                logger.info(f"Generated chain-of-thought reasoning (attempt {attempt + 1})")
                return {
                    "reasoning": reasoning,
                    "confidence": confidence,
                    "provider": "gemini",
                    "model": "gemini-2.0-flash-thinking-exp"
                }
                
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Chain-of-thought attempt {attempt + 1} failed: {error_str}")
                
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)                
                else:
                    logger.error(f"All chain-of-thought attempts failed: {error_str}")
                    raise Exception(f"Gemini chain-of-thought failed after {max_retries} attempts: {error_str}")
        
        raise Exception("Unexpected error in chain-of-thought generation")

    def _build_chain_of_thought_prompt(self, question: str, context: str) -> str:
        """Build prompt for step-by-step chain-of-thought reasoning."""
        
        # Check if context contains user attachments
        has_attachments = "🔴 USER-PROVIDED" in context
        attachment_instruction = ""
        if has_attachments:
            attachment_instruction = """
🔴🔴🔴 CRITICAL ATTACHMENT PRIORITY 🔴🔴🔴: The user has provided specific files/attachments for analysis. These are marked with "🔴 USER-PROVIDED" in the context. 

MANDATORY REQUIREMENTS:
1. Your thinking MUST start by identifying and analyzing the user's attachments FIRST
2. You MUST reference the actual content of these attachments directly in your reasoning
3. You MUST prioritize the user's attachment content over repository code analysis
4. Your final answer MUST be primarily based on the user's attachments
5. If asked about relationships, compare attachment content to repository content

ATTACHMENT CONTENT TAKES ABSOLUTE PRIORITY in your analysis and reasoning.
"""
        
        return f"""You are an expert AI assistant that thinks step-by-step like DeepSeek R1. You need to show your actual reasoning process - not just structured analysis, but real thinking with exploration, uncertainty, corrections, and discoveries.

{attachment_instruction}

CRITICAL: Your response must show genuine exploration and reasoning. Think like a human would - with uncertainty, questions, discoveries, and course corrections. Make it feel like reading someone's actual thought process.

Your thinking should include:
- Initial thoughts and first impressions
- Exploring different possibilities and approaches
- Questioning your own assumptions
- Making connections between concepts
- Getting stuck and trying different angles
- Having insights and "aha" moments
- Correcting yourself when you realize something
- Building understanding piece by piece
- ESPECIALLY: If user attachments are present, focus on analyzing their specific content

Structure your response as:

<thinking>
Let me think about this question step by step...

Hmm, when I look at this question about "{question}", my first thought is... Actually, let me be more careful here. I should probably start by understanding what exactly is being asked.

{f"Wait, I notice there are user-provided attachments marked with 🔴. Let me focus on those first since that's what the user specifically wants me to analyze..." if has_attachments else "Looking at the repository context, I can see... Wait, let me examine this more closely. There seems to be..."}

Actually, I think I was approaching this wrong. Let me step back and think about this differently...

Oh wait, I just noticed something important... This changes how I think about the problem...

Let me try a different approach. If I consider... No, that doesn't seem right either.

Actually, let me look at this from the perspective of... Hmm, that's interesting. I'm starting to see a pattern here...

Wait, I think I'm overcomplicating this. Let me go back to basics...

Oh, I see now! The key insight is... This makes much more sense when I think about it this way...

Actually, let me double-check this reasoning... Yes, I think that's correct.

So putting this all together, I believe...
</thinking>

Based on my thinking above, here's my answer:

[Provide a clear, comprehensive final answer that directly references any user-provided attachment content]

Repository Context:
{context}

Question: {question}

Show your genuine reasoning process with all the uncertainty, exploration, and discoveries. Make it feel natural and human-like. If user attachments are present, make sure your reasoning and final answer directly reference their specific content.
"""

    def _build_qa_prompt(self, question: str, context: str) -> str:
        """Build prompt for Q&A."""        
        # Check if context contains user attachments
        has_user_attachments = "🔴 USER-PROVIDED" in context
          # Check if this is a commit-focused question
        is_commit_focused = "🔄 COMMIT ANALYSIS RESULTS:" in context
        
        # Initialize instructions
        commit_instruction = ""
        attachment_instruction = ""
        
        if is_commit_focused:
            commit_instruction = """
🔄🔄� COMMIT-FOCUSED QUESTION DETECTED 🔄🔄🔄
This question is specifically about commits/commit history. 

MANDATORY REQUIREMENTS:
1. FOCUS PRIMARILY on the commit data provided in the context
2. For "last commit" questions, provide specific details about the most recent commit
3. Include commit SHA, message, author, date, and any file changes
4. Do NOT provide extensive code file analysis unless specifically asked
5. Keep repository file discussion minimal and only as supporting context
6. Be direct and concise - user wants commit information, not code architecture

COMMIT DATA TAKES PRIORITY over file content analysis.
"""
        
        if has_user_attachments:
            attachment_instruction = """
🔴🔴🔴 MANDATORY USER ATTACHMENT ACKNOWLEDGMENT 🔴🔴🔴
The user has provided specific files/attachments for analysis (marked with "🔴 USER-PROVIDED"). 
YOU MUST FOLLOW THESE RULES OR YOUR RESPONSE WILL BE REJECTED:

1. MANDATORY FIRST SENTENCE: "I can see you've provided [X] attachment(s): [list the exact filenames from USER-PROVIDED sections]"
2. MANDATORY SECOND PARAGRAPH: Analyze ONLY the user's attachments first, before ANY repository analysis
3. MANDATORY: Quote specific content from the user's attachments with phrases like "In your attached [filename], you mention..."
4. MANDATORY: Answer the question primarily based on the USER'S ATTACHMENTS, not repository files
5. MANDATORY: If the question asks about relationships, compare the attachment content to repository content
6. FORBIDDEN: Do not analyze repository files without first analyzing user attachments
7. FORBIDDEN: Do not ignore or skip mentioning the user's attachments

ATTACHMENT CONTENT TAKES ABSOLUTE PRIORITY over repository analysis.
"""
        
        return f"""
You are an expert software engineer and code analyst with deep understanding of software architecture, design patterns, and development practices.

{attachment_instruction}

{commit_instruction}

Your goal is to provide comprehensive, accurate answers about code repositories by:
1. Analyzing the actual code structure and implementation details
2. Understanding relationships between files and components
3. Explaining architectural decisions and design patterns
4. Providing specific code references and examples
5. Going beyond surface-level documentation to explain how things actually work

IMPORTANT GUIDELINES:
- Focus on the actual code implementation, not just README files
- Explain the "why" and "how", not just the "what"
- Reference specific files, functions, classes, and code sections
- Identify design patterns, architectural choices, and dependencies
- If analyzing configuration files, explain their purpose and impact
- For folder/directory questions, analyze the actual contents and structure
- Use technical accuracy and provide actionable insights
- If you find conflicting information, prioritize actual code over documentation

🔄 FOR COMMIT-RELATED QUESTIONS:
- If commit data is provided in the context, analyze it thoroughly
- For "last commit" or "recent commits" questions, provide specific details like:
  * Commit SHA (shortened)
  * Commit message
  * Author and timestamp
  * Files changed (if available)
  * Brief description of what the commit does
- Always provide concrete, factual information from the commit data
- If no commit data is available, explain that and suggest how the user can find this information

Repository Context:
{context}

Question: {question}

Provide a comprehensive, technical answer that demonstrates deep understanding of the codebase:
"""

    def _prepare_qa_context(self, repo_info: str, files_content: List[str]) -> str:
        """Prepare context for Q&A from repository files."""
        context_parts = [f"Repository Information:\n{repo_info}"]
        
        for i, content in enumerate(files_content):
            # Truncate very long files
            if len(content) > 5000:
                content = content[:5000] + "\n... [truncated]"
              # CRITICAL FIX: Preserve existing "File:" formatting for attachments
            # Don't add generic "File {i+1}:" prefix if content already starts with "File:" or "🔴 USER-PROVIDED"
            if content.startswith("File: ") or content.startswith("🔴 USER-PROVIDED"):
                # This is already formatted (likely an attachment), use as-is
                context_parts.append(content)
                if "🔴 USER-PROVIDED" in content:
                    logger.info(f"🎉 PRESERVED USER-PROVIDED ATTACHMENT: {content[:100]}...")
                else:
                    logger.info(f"🎉 PRESERVED ATTACHMENT FORMATTING: {content[:100]}...")
            else:
                # This is a repository file, add standard prefix
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
              # Initialize sentence-transformers embedding model ONLY if not using Gemini embeddings
            if not self.settings.use_gemini_embeddings:
                try:
                    logger.info("Loading paraphrase-mpnet-base-v2 embedding model for local embeddings...")
                    self.embedding_model = SentenceTransformer('sentence-transformers/paraphrase-mpnet-base-v2')
                    logger.info("Local embedding model loaded successfully")
                except Exception as e:
                    logger.warning(f"Failed to load sentence-transformers model: {str(e)}")
                    logger.info("Using fallback embedding approach")
                    self.embedding_model = None
            else:
                logger.info("Skipping local embedding model load - using Gemini embeddings")
                self.embedding_model = None
            
            self._initialized = True
            
        if not self._configured:
            # Parse multiple API keys
            api_keys = []
            
            # First, try to get multiple keys from GEMINI_API_KEYS
            if self.settings.gemini_api_keys:
                keys = [key.strip() for key in self.settings.gemini_api_keys.split(',') if key.strip()]
                # Filter out placeholder values
                valid_keys = [key for key in keys if key != "your-gemini-api-key" and key]
                api_keys.extend(valid_keys)
                logger.info(f"Found {len(valid_keys)} API keys from GEMINI_API_KEYS")
            
            # Fallback to single API key if no multiple keys provided
            if not api_keys and self.settings.gemini_api_key != "your-gemini-api-key":
                api_keys.append(self.settings.gemini_api_key)
                logger.info("Using single API key from GEMINI_API_KEY")
            
            if not api_keys:
                raise ValueError("Please set valid GEMINI_API_KEY or GEMINI_API_KEYS in your environment variables")
            
            # Initialize API key manager
            self.api_key_manager = APIKeyManager(api_keys)
            
            # Configure with first available key
            first_key = self.api_key_manager.get_active_key()
            if first_key:
                genai.configure(api_key=first_key)
                # Use Gemini 2.0 Flash Lite which is faster and has better rate limits
                self.text_model = genai.GenerativeModel('gemini-2.0-flash-lite')
                logger.info(f"Initialized Gemini 2.0 Flash Lite model with {len(api_keys)} API keys for rotation")
            else:
                raise ValueError("No active API keys available")
                
            self._configured = True

    async def categorize_question(self, question: str, repository_context: str = "") -> Dict[str, Any]:
        """Categorize a question using AI to determine its type and relevant tags."""
        self._ensure_configured()
        
        # Check circuit breaker
        if self.rate_limit_manager.is_circuit_breaker_open():
            circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
            logger.warning("Circuit breaker is open, skipping categorization", **circuit_status)
            # Return default categorization when circuit breaker is open
            return {
                "category": "general",
                "tags": ["question"],
                "confidence": 0.3
            }
        
        max_retries = 3  # Fewer retries for categorization since it's not critical
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Build categorization prompt
                prompt = self._build_categorization_prompt(question, repository_context)
                
                # Generate categorization
                response = await asyncio.to_thread(
                    self.text_model.generate_content,
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.1,  # Low temperature for consistent categorization
                        top_p=0.8,
                        max_output_tokens=200,  # Short response needed
                    )
                )
                categorization_text = response.text.strip()
                
                # Parse the AI response to extract category and tags
                result = self._parse_categorization_response(categorization_text)
                
                # Record success
                self.rate_limit_manager.record_success()
                
                logger.debug("Generated categorization", question_length=len(question), 
                           category=result.get('category'), tags=result.get('tags'))
                
                return result
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    logger.warning(
                        f"Categorization failed, retrying in {retry_delay}s", 
                        attempt=attempt + 1, 
                        max_retries=max_retries,
                        error=error_str[:100]
                    )
                    
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    # Not retryable or max retries reached - return default categorization
                    logger.warning("Failed to categorize question, using default", error=error_str)
                    return {
                        "category": "general",
                        "tags": ["question"],
                        "confidence": 0.2
                    }
        
        # Fallback categorization
        return {
            "category": "general",
            "tags": ["question"],
            "confidence": 0.1
        }

    def _build_categorization_prompt(self, question: str, repository_context: str) -> str:
        """Build prompt for question categorization."""
        return f"""
You are an expert at categorizing programming and software development questions. 

Your task is to analyze the question and provide:
1. A category (one word)
2. Relevant tags (2-4 words)
3. A confidence score (0.0-1.0)

Categories to choose from:
- architecture: Questions about system design, patterns, structure
- implementation: How to implement specific features or functionality  
- debugging: Issues, errors, troubleshooting problems
- documentation: Questions about README, setup, usage instructions
- configuration: Settings, environment, deployment, build processes
- performance: Optimization, speed, efficiency concerns
- security: Authentication, authorization, vulnerabilities
- api: API endpoints, integration, external services
- database: Data models, queries, migrations, schema
- testing: Unit tests, integration tests, test setup
- deployment: Hosting, CI/CD, production concerns
- general: General questions that don't fit other categories

Repository Context: {repository_context}

Question: {question}

Response format (exactly):
Category: [category]
Tags: [tag1, tag2, tag3]
Confidence: [0.0-1.0]

Analyze the question and respond:
"""

    def _parse_categorization_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the AI categorization response."""
        try:
            lines = response_text.strip().split('\n')
            result = {
                "category": "general",
                "tags": ["question"],
                "confidence": 0.5
            }
            
            for line in lines:
                line = line.strip()
                if line.startswith('Category:'):
                    category = line.split(':', 1)[1].strip().lower()
                    # Validate category
                    valid_categories = {
                        'architecture', 'implementation', 'debugging', 'documentation',
                        'configuration', 'performance', 'security', 'api', 'database',
                        'testing', 'deployment', 'general'
                    }
                    if category in valid_categories:
                        result["category"] = category
                        
                elif line.startswith('Tags:'):
                    tags_str = line.split(':', 1)[1].strip()
                    # Parse tags - handle both comma-separated and square bracket format
                    tags_str = tags_str.strip('[]')
                    tags = [tag.strip().lower() for tag in tags_str.split(',') if tag.strip()]
                    # Limit to 4 tags and filter out empty ones
                    result["tags"] = tags[:4] if tags else ["question"]
                    
                elif line.startswith('Confidence:'):
                    try:
                        confidence = float(line.split(':', 1)[1].strip())
                        result["confidence"] = max(0.0, min(1.0, confidence))  # Clamp to 0-1
                    except (ValueError, IndexError):
                        pass  # Keep default confidence
                        
            return result
            
        except Exception as e:
            logger.warning(f"Failed to parse categorization response: {e}")
            return {
                "category": "general",
                "tags": ["question"],
                "confidence": 0.3
            }


    async def generate_content_async(self, prompt: str, max_tokens: int = 500, temperature: float = 0.7) -> str:
        """Generate content using Gemini API with async support."""
        try:
            # Use the existing answer_question method as a fallback
            response = await self.answer_question(
                question=prompt,
                context="Analytics insights generation",
                files_content=[]
            )
            return response.get('answer', 'Unable to generate insights at this time.')
        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            return "Unable to generate insights at this time."


# Global Gemini client instance
gemini_client = GeminiClient()
