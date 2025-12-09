"""
Gemini API client for AI-powered processing with API key rotation and enhanced rate limiting.
"""
import asyncio
import time
import random
import redis
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
    
    def __init__(self, api_keys: List[str], redis_client: Optional[redis.Redis] = None):
        self.api_keys = api_keys
        self.current_index = 0
        self.redis_client = redis_client  # For persistent rate limit tracking
        self.key_status = {}  # Track status of each key
        self.key_last_error_time = {}  # Track when each key last had an error
        self.key_last_rate_limit_time = {}  # Track when each key was last rate limited
        self.key_consecutive_failures = {}  # Track consecutive failures per key
        self.key_last_success_time = {}  # Track when each key last succeeded
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.rate_limit_cooldown = 180  # 180 seconds cooldown after rate limit hit (3 minutes for IP-based limiting)
        self.max_consecutive_failures = 3  # Lower threshold per key
        self.inter_key_delay = 5.0  # Minimum 5 seconds between rotating keys (IP-based rate limit)
        self.min_request_interval = 20.0  # Minimum 20 seconds between ANY requests from this IP
        
        # Initialize status for all keys
        for key in api_keys:
            self.key_status[key] = "active"
            self.key_last_error_time[key] = None
            self.key_consecutive_failures[key] = 0
            self.key_last_success_time[key] = None
            
            # Load rate limit time from Redis if available
            if self.redis_client:
                try:
                    redis_key = f"gemini_rate_limit:{self._hash_key(key)}"
                    stored_time = self.redis_client.get(redis_key)
                    if stored_time:
                        self.key_last_rate_limit_time[key] = float(stored_time)
                        time_since = time.time() - float(stored_time)
                        if time_since < self.rate_limit_cooldown:
                            logger.info(f"API key index {self.api_keys.index(key)} still in cooldown (started {time_since:.0f}s ago, {self.rate_limit_cooldown - time_since:.0f}s remaining)")
                    else:
                        self.key_last_rate_limit_time[key] = None
                except Exception as e:
                    logger.warning(f"Failed to load rate limit time from Redis: {e}")
                    self.key_last_rate_limit_time[key] = None
            else:
                self.key_last_rate_limit_time[key] = None
            
        logger.info(f"Initialized API key manager with {len(api_keys)} keys")
        
        # Log status of all keys
        available_count = sum(1 for key in api_keys if self._is_key_available(key))
        logger.info(f"Available keys: {available_count}/{len(api_keys)}")
    
    def _hash_key(self, api_key: str) -> str:
        """Create a safe hash of the API key for Redis storage."""
        import hashlib
        return hashlib.sha256(api_key.encode()).hexdigest()[:16]
    
    def get_active_key(self) -> Optional[str]:
        """Get the next active API key for use."""
        key, _ = self.get_active_key_with_index()
        return key
    
    def get_active_key_with_index(self) -> tuple[Optional[str], int]:
        """Get the next active API key with its index for quotaUser."""
        if not self.api_keys:
            return None, -1
        
        # CRITICAL: Enforce minimum interval between ANY requests (IP-based rate limit)
        # Check if we need to wait before making ANY request
        most_recent_success = max(
            (t for t in self.key_last_success_time.values() if t is not None),
            default=None
        )
        if most_recent_success:
            time_since_last = time.time() - most_recent_success
            if time_since_last < self.min_request_interval:
                wait_time = self.min_request_interval - time_since_last
                logger.warning(f"⏰ IP rate limit: Waiting {wait_time:.1f}s before next request (last request {time_since_last:.1f}s ago)")
                time.sleep(wait_time)
            
        # Find the next available key
        attempts = 0
        while attempts < len(self.api_keys):
            key = self.api_keys[self.current_index]
            
            if self._is_key_available(key):
                logger.debug(f"Using API key index {self.current_index}")
                return key, self.current_index
            
            # Move to next key
            self.current_index = (self.current_index + 1) % len(self.api_keys)
            attempts += 1
        
        # All keys are unavailable
        logger.warning("🚫 All API keys are currently unavailable - IP rate limit exhausted")
        return None, -1
    
    def _is_key_available(self, key: str) -> bool:
        """Check if a specific key is available for use."""
        if self.key_status[key] == "disabled":
            return False
        
        # CRITICAL: Check rate limit cooldown first
        # Don't reuse a key that was just rate-limited (give it 90s to reset + burst limit recovery)
        last_rate_limit_time = self.key_last_rate_limit_time.get(key)
        if last_rate_limit_time:
            time_since_rate_limit = time.time() - last_rate_limit_time
            if time_since_rate_limit < self.rate_limit_cooldown:
                # Key is in cooldown period after rate limit
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
            # Record success time for IP-based rate limiting
            self.key_last_success_time[key] = time.time()
            # Clear rate limit cooldown on success
            self.key_last_rate_limit_time[key] = None
            
            # Clear from Redis
            if self.redis_client:
                try:
                    redis_key = f"gemini_rate_limit:{self._hash_key(key)}"
                    self.redis_client.delete(redis_key)
                except Exception as e:
                    logger.warning(f"Failed to clear rate limit from Redis: {e}")
            
    def record_failure(self, key: str, error_str: str):
        """Record failed API call for a key."""
        self.key_consecutive_failures[key] = self.key_consecutive_failures.get(key, 0) + 1
        self.key_last_error_time[key] = time.time()
        
        # CRITICAL: Track rate limit separately for cooldown
        error_lower = error_str.lower()
        if "429" in error_str or "resource_exhausted" in error_lower or "rate limit" in error_lower or "quota" in error_lower:
            current_time = time.time()
            self.key_last_rate_limit_time[key] = current_time
            logger.warning(f"🚫 API key index {self.api_keys.index(key)} rate limited - entering 180s cooldown (IP-based rate limit)")
            
            # Persist to Redis so cooldown survives worker restarts
            if self.redis_client:
                try:
                    redis_key = f"gemini_rate_limit:{self._hash_key(key)}"
                    # Store with 120s expiry (30s buffer beyond cooldown)
                    self.redis_client.setex(redis_key, 120, str(current_time))
                except Exception as e:
                    logger.warning(f"Failed to save rate limit to Redis: {e}")
        
        # Check if key should be temporarily disabled
        if self.key_consecutive_failures[key] >= self.max_consecutive_failures:
            self.key_status[key] = "circuit_breaker"
            logger.warning(f"Circuit breaker triggered for API key index {self.api_keys.index(key)}")
    
    def all_keys_exhausted(self) -> bool:
        """
        Check if ALL keys are in cooldown due to IP-based rate limiting.
        
        When this returns True, no point rotating - should fail fast and
        fall back to alternative retrieval methods instead of waiting 60s+ per attempt.
        
        This prevents the 405s wait scenario that causes MetaController timeout.
        """
        if not self.api_keys:
            return True
        
        current_time = time.time()
        
        # Check if ALL keys are in rate limit cooldown
        available_count = 0
        for key in self.api_keys:
            last_rate_limit = self.key_last_rate_limit_time.get(key)
            if not last_rate_limit:
                # Key has never been rate limited
                available_count += 1
            elif (current_time - last_rate_limit) >= self.rate_limit_cooldown:
                # Key cooldown expired
                available_count += 1
        
        # All keys exhausted if none available
        exhausted = (available_count == 0)
        if exhausted:
            logger.warning(f"🚫 All {len(self.api_keys)} Gemini keys are in IP-based rate limit cooldown")
        
        return exhausted
    
    def rotate_to_next_key(self):
        """Manually rotate to the next key with delay to avoid burst limits."""
        # Add small delay to avoid burst limits when rapidly rotating keys
        time.sleep(self.inter_key_delay)
        self.current_index = (self.current_index + 1) % len(self.api_keys)
        
    def get_status(self) -> Dict[str, Any]:
        """Get status of all API keys."""
        status = {}
        for i, key in enumerate(self.api_keys):
            last_rate_limit = self.key_last_rate_limit_time.get(key)
            time_since_rate_limit = time.time() - last_rate_limit if last_rate_limit else None
            in_cooldown = time_since_rate_limit is not None and time_since_rate_limit < self.rate_limit_cooldown
            
            status[f"key_{i}"] = {
                "status": self.key_status[key],
                "consecutive_failures": self.key_consecutive_failures[key],
                "time_since_last_error": time.time() - self.key_last_error_time[key] 
                    if self.key_last_error_time[key] else None,
                "time_since_rate_limit": time_since_rate_limit,
                "in_cooldown": in_cooldown
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
            # FIXED: Cap at 60s max delay to prevent 405s waits that cause timeouts
            # With base_delay=5: 5s, 15s, 45s, 60s (capped), 60s (capped)...
            # This prevents MetaController timeout while still allowing multiple retries
            delay = base_delay * (3 ** attempt)
            return min(delay, 60)  # Cap at 60 seconds maximum
        elif self.is_service_unavailable(error_str):
            # Moderate delays for service issues, also capped
            delay = base_delay * (2 ** attempt)
            return min(delay, 30)  # Cap at 30 seconds
        else:
            # Standard exponential backoff for other errors, capped
            delay = base_delay * (2 ** attempt)
            return min(delay, 20)  # Cap at 20 seconds
    
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
                
                # Use REST API for embeddings
                base_url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
                
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
                
                # Build REST API request
                params = {"key": current_key}
                headers = {"Content-Type": "application/json"}
                data = {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": text}]},
                    "taskType": "SEMANTIC_SIMILARITY"
                }
                
                # Make REST API call
                if not hasattr(self, 'http_client'):
                    import httpx
                    self.http_client = httpx.AsyncClient()
                
                response = await self.http_client.post(base_url, params=params, headers=headers, json=data, timeout=30.0)
                response.raise_for_status()
                result = response.json()
                
                embedding = result['embedding']['values']
                
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
        """
        Generate summary using UnifiedAIClient (Grok-3-mini → Gemini fallback).
        
        This provides better quality than Gemini-2.0-flash-lite alone.
        """
        from services.unified_ai_client import unified_client
        
        try:
            # Use UnifiedAIClient with summary task type (routes to Grok-3-mini)
            prompt = self._build_summary_prompt(text, context)
            
            summary = await unified_client.generate_content_async(
                prompt=prompt,
                temperature=0.3,
                max_tokens=1000,
                task_type='summary'
            )
            
            return summary.strip()
            
        except Exception as e:
            logger.error(f"Summary generation failed: {str(e)}")
            # Last resort: try Gemini directly as ultimate fallback
            return await self._generate_summary_gemini_fallback(text, context)
    
    async def _generate_summary_gemini_fallback(self, text: str, context: str = "code repository") -> str:
        """Emergency fallback to Gemini if UnifiedAIClient fails."""
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
                
                # Use REST API for summary generation with quotaUser
                base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"
                
                # Prepare prompt
                prompt = self._build_summary_prompt(text, context)
                
                # Build request with quotaUser
                params = {"key": current_key}
                headers = {"Content-Type": "application/json"}
                data = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.3,
                        "topP": 0.8,
                        "topK": 40,
                        "maxOutputTokens": 1000
                    },
                    "safetySettings": self.safety_settings
                }
                
                # Make REST API call
                if not hasattr(self, 'http_client'):
                    import httpx
                    self.http_client = httpx.AsyncClient()
                
                response = await self.http_client.post(base_url, params=params, headers=headers, json=data, timeout=120.0)
                response.raise_for_status()
                result = response.json()
                
                # Extract text from response
                summary = result['candidates'][0]['content']['parts'][0]['text'].strip()
                
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
            is_user_attachment = "🔴 USER-PROVIDED" in content
            if is_user_attachment:
                attachment_count += 1
                logger.info(f"Q&A Debug - USER ATTACHMENT {attachment_count} preview: {content_preview}")
            else:
                repo_file_count += 1
                logger.info(f"Q&A Debug - REPOSITORY FILE {repo_file_count} preview: {content_preview}")
        logger.info(f"Q&A Context Summary - Repository files: {repo_file_count}, User Attachments: {attachment_count}")
        
        for attempt in range(max_retries):
            try:
                # Get active API key
                current_key = self.api_key_manager.get_active_key()
                if not current_key:
                    raise Exception("No active API keys available for Q&A")
                
                # Use REST API for Q&A with quotaUser
                base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"
                
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
                prompt = self._build_qa_prompt(question, combined_context)
                
                # Generate answer with adaptive token limits based on context size
                context_size = len(combined_context)
                if context_size > 15000:  # Very large context
                    max_tokens = 6000  # More tokens for complex questions
                elif context_size > 8000:  # Large context  
                    max_tokens = 5000  # Medium token limit
                else:  # Normal context
                    max_tokens = 4000  # Standard limit
                
                logger.info(f"Using {max_tokens} max tokens for context size: {context_size} chars")
                
                # Build REST API request
                params = {"key": current_key}
                headers = {"Content-Type": "application/json"}
                data = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "topP": 0.9,
                        "maxOutputTokens": max_tokens
                    },
                    "safetySettings": self.safety_settings
                }
                
                # Make REST API call
                if not hasattr(self, 'http_client'):
                    import httpx
                    self.http_client = httpx.AsyncClient()
                
                response = await self.http_client.post(base_url, params=params, headers=headers, json=data, timeout=120.0)
                response.raise_for_status()
                result = response.json()
                
                answer = result['candidates'][0]['content']['parts'][0]['text'].strip()
                
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
        """Generate step-by-step chain-of-thought reasoning using Gemini's multi-step capabilities."""
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
        
        # Check if context contains user attachments or repository files (NEW: clearer markers)
        has_user_attachments = "� USER-PROVIDED ATTACHMENTS" in context
        has_repository_files = "📁 REPOSITORY FILES" in context
        
        attachment_instruction = ""
        
        if has_user_attachments and has_repository_files:
            # Both attachments and repository files present
            attachment_instruction = """
🎯 CONTEXT STRUCTURE - IMPORTANT:
- Files under "📎 USER-PROVIDED ATTACHMENTS" are files the user explicitly uploaded
- Files under "📁 REPOSITORY FILES" are from the codebase

ANALYSIS STRATEGY:
1. **If the question is about "this file", "this CSV", "this document", or uploaded content** → Focus PRIMARILY on 📎 USER-PROVIDED ATTACHMENTS
2. **If the question is about code, implementation, or "how does X work?"** → Focus PRIMARILY on 📁 REPOSITORY FILES
3. **If the question asks to compare or relate both** → Analyze both sections

Think about what the user is actually asking for before diving into the analysis. Your reasoning should be CLEAR about which section you're analyzing.
"""
        elif has_user_attachments:
            # Only user attachments present
            attachment_instruction = """
🔴🔴🔴 CRITICAL ATTACHMENT PRIORITY 🔴🔴🔴: The user has provided specific files/attachments for analysis. These are marked with "� USER-PROVIDED ATTACHMENTS" in the context. 

MANDATORY REQUIREMENTS:
1. Your thinking MUST start by identifying and analyzing the user's attachments FIRST
2. You MUST reference the actual content of these attachments directly in your reasoning
3. You MUST prioritize the user's attachment content in your analysis
4. Your final answer MUST be primarily based on the user's attachments

ATTACHMENT CONTENT TAKES ABSOLUTE PRIORITY in your analysis and reasoning.
"""
        elif "attachment" in question.lower() or "this file" in question.lower() or "uploaded" in question.lower():
            # Question mentions attachments but none provided
            attachment_instruction = """
⚠️⚠️⚠️ ATTACHMENT QUESTION BUT NO USER ATTACHMENTS FOUND ⚠️⚠️⚠️

CRITICAL THINKING REQUIREMENT:
- Acknowledge immediately that no user attachments were provided
- Do NOT confuse repository files with user attachments
- If the user asks about "attachments", recognize this as a potential misunderstanding
- Consider that they might want to upload files but forgot, or are confused about the feature
- Do NOT treat repository files as "attachments" in your reasoning
"""
        
        return f"""You are an expert AI assistant with strong multi-step reasoning capabilities. Show your genuine thought process with exploration, uncertainty, corrections, and discoveries.

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
- ESPECIALLY: When analyzing files, be VERY CLEAR about whether you're looking at user attachments vs repository code

Structure your response as:

<thinking>
Let me think about this question step by step...

Hmm, when I look at this question about "{question}", my first thought is... Actually, let me be more careful here. I should probably start by understanding what exactly is being asked.

{f"Wait, I notice there are user-provided attachments marked with �. Let me focus on those first since that's what the user specifically wants me to analyze..." if has_user_attachments else "Looking at the repository context, I can see... Wait, let me examine this more closely. There seems to be..."}

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
        
        # If attachments are present, put instruction at the very beginning
        if has_user_attachments:
            return f"""
🔴🔴🔴 CRITICAL: USER ATTACHMENTS DETECTED - ANALYZE THESE FIRST 🔴🔴🔴

The context contains user-provided attachments marked with "🔴 USER-PROVIDED ATTACHMENT".
You MUST acknowledge and analyze these attachments in your response.
Do NOT say you don't see any attachments - they are provided at the beginning of the context.

MANDATORY REQUIREMENTS:
1. Start your response by acknowledging the attachments: "I can see you've provided attachments including [filename]"
2. Analyze the attachment content/metadata provided in the context
3. Answer the question in the context of the attachments
4. If the attachments are binary files, explain that you can see the metadata but cannot read the content

You are an expert software engineer and code analyst.

Repository Context:
{context}

Question: {question}

Provide a comprehensive answer that includes analysis of the user's attachments:
"""
        
        # Normal prompt for questions without attachments
        return f"""
You are an expert software engineer and code analyst with deep understanding of software architecture, design patterns, and development practices.

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

Repository Context:
{context}

Question: {question}

Provide a comprehensive, technical answer that demonstrates deep understanding of the codebase:
"""

    def _prepare_qa_context(self, repo_info: str, files_content: List[str]) -> str:
        """Prepare context for Q&A from repository files."""
        context_parts = []
        
        # First, add all user attachments at the very beginning for maximum visibility
        for content in files_content:
            if content.startswith("🔴 USER-PROVIDED"):
                context_parts.append(content)
        
        # Then repository info
        context_parts.append(f"Repository Information:\n{repo_info}")
        
        # Then other files
        for content in files_content:
            if not content.startswith("🔴 USER-PROVIDED"):
                # Preserve existing "File:" formatting for repository files
                if content.startswith("File: "):
                    context_parts.append(content)
                else:
                    context_parts.append(f"File:\n{content}")
        
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
            
            # Get Redis client for persistent rate limit tracking
            redis_conn = None
            try:
                from services.redis_client import redis_client
                if hasattr(redis_client, 'client') and redis_client.client:
                    redis_conn = redis_client.client
                    logger.info("Connected to Redis for persistent rate limit tracking")
            except Exception as e:
                logger.warning(f"Could not connect to Redis for rate limit tracking: {e}")
            
            # Initialize API key manager with Redis support
            self.api_key_manager = APIKeyManager(api_keys, redis_client=redis_conn)
            
            # Get first available key (for compatibility, but we use REST API now)
            first_key = self.api_key_manager.get_active_key()
            if first_key:
                logger.info(f"Initialized Gemini 2.0 Flash Lite REST API with {len(api_keys)} API keys for rotation")
                logger.warning("⚠️ IP-based rate limiting in effect: All keys share the same quota from this IP")
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
        """Generate content using Gemini API with async support and custom token limits."""
        self._ensure_configured()
        
        max_retries = 5  # Increased from 3 to match other methods
        base_delay = 20  # 20 seconds base delay for IP-based rate limiting (was 5s)
        
        for attempt in range(max_retries):
            try:
                # Get active API key with rotation
                current_key, key_idx = self.api_key_manager.get_active_key_with_index()
                if not current_key:
                    logger.warning("No active API keys available for content generation")
                    raise Exception("No API keys available")
                
                # Use REST API with quotaUser for quota isolation
                import httpx
                base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"
                
                # Build quota user ID from task context
                quota_user_param = f"content_gen_k{key_idx}"
                params = {"key": current_key, "quotaUser": quota_user_param}
                
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "GitTLDR/1.0"
                }
                
                data = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": temperature,
                        "topP": 0.95,
                        "maxOutputTokens": max_tokens
                    },
                    "safetySettings": [
                        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                    ]
                }
                
                logger.info(f"Generating content with max_tokens={max_tokens}, temperature={temperature}, quotaUser={quota_user_param}")
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(base_url, params=params, headers=headers, json=data)
                    response.raise_for_status()
                    result_json = response.json()
                
                # Extract text from response
                if 'candidates' in result_json and result_json['candidates']:
                    candidate = result_json['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        result = candidate['content']['parts'][0]['text'].strip()
                        
                        # Check finish reason
                        finish_reason = candidate.get('finishReason', 'STOP')
                        logger.info(f"Generation finish_reason: {finish_reason}, output length: {len(result)} chars")
                        
                        if finish_reason == 'STOP':
                            logger.info("✅ Content generation completed naturally")
                        elif finish_reason == 'MAX_TOKENS':
                            logger.warning(f"⚠️ Content truncated: Hit max_tokens limit ({max_tokens})")
                        elif finish_reason == 'SAFETY':
                            logger.warning("⚠️ Content blocked by safety filters")
                        elif finish_reason == 'RECITATION':
                            logger.warning("⚠️ Content flagged for recitation")
                        
                        # Record success
                        self.api_key_manager.record_success(current_key)
                        self.rate_limit_manager.record_success()
                        
                        return result
                    else:
                        logger.warning("Gemini returned empty response")
                        raise Exception("Empty response from Gemini")
                else:
                    logger.warning("Gemini returned response without candidates")
                    raise Exception("No candidates in response")
                    
            except Exception as e:
                error_str = str(e)
                
                # Record failure for rate limiting
                if current_key:
                    self.api_key_manager.record_failure(current_key, error_str)
                
                # Record failure for rate limiting manager
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry using the sophisticated retry logic
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    # Use RateLimitManager's intelligent retry delay calculation
                    # This gives longer delays for rate limits: 5s, 15s, 45s, 135s, 405s
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    # Rotate key on rate limit errors
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        self.api_key_manager.rotate_to_next_key()
                        logger.warning(
                            f"Rate limit hit, rotating key and retrying in {retry_delay:.2f}s (attempt {attempt + 1}/{max_retries})",
                            new_key_index=self.api_key_manager.current_index,
                            error=error_str[:200]
                        )
                    elif self.rate_limit_manager.is_service_unavailable(error_str):
                        logger.warning(
                            f"Service unavailable, retrying in {retry_delay:.2f}s (attempt {attempt + 1}/{max_retries})",
                            error=error_str[:200]
                        )
                    elif self.rate_limit_manager.is_temporary_error(error_str):
                        logger.warning(
                            f"Temporary error, retrying in {retry_delay:.2f}s (attempt {attempt + 1}/{max_retries})",
                            error=error_str[:200]
                        )
                    
                    await asyncio.sleep(retry_delay)
                    continue
                
                # For last attempt or non-retryable errors, log and raise
                if attempt == max_retries - 1:
                    circuit_status = self.rate_limit_manager.get_circuit_breaker_status()
                    key_status = self.api_key_manager.get_status()
                    logger.error(
                        f"Failed to generate content after {max_retries} attempts: {error_str}",
                        circuit_status=circuit_status,
                        key_status=key_status
                    )
                    raise
                    
                # For non-retryable errors, raise immediately
                logger.error(f"Non-retryable error in content generation: {error_str}")
                raise
        
        raise Exception("Failed to generate content after all retries")

    async def analyze_image_with_vision(self, image_base64: str, prompt: str, mime_type: str = "image/png") -> str:
        """Analyze an image using Gemini's vision capabilities.
        
        Args:
            image_base64: Base64 encoded image data
            prompt: Text prompt describing what to analyze
            mime_type: MIME type of the image (e.g., 'image/png', 'image/jpeg')
            
        Returns:
            str: Analysis result from Gemini
        """
        self._ensure_configured()
        
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Get active API key
                current_key = self.api_key_manager.get_active_key()
                if not current_key:
                    logger.warning("No active API keys available for vision analysis")
                    return "Unable to analyze image - no API keys available"
                
                # Configure Gemini with current key
                genai.configure(api_key=current_key)
                
                # Use Gemini 2.0 Flash for vision (supports images)
                vision_model = genai.GenerativeModel('gemini-2.0-flash-exp')
                
                # Prepare the image part
                import base64
                from google.generativeai.types import content_types
                
                # Decode base64 to bytes
                image_bytes = base64.b64decode(image_base64)
                
                # Create image part
                image_part = {
                    "mime_type": mime_type,
                    "data": image_bytes
                }
                
                # Generate content with image and text
                response = await asyncio.to_thread(
                    vision_model.generate_content,
                    [prompt, image_part],
                    safety_settings=self.safety_settings
                )
                
                # Extract text from response
                if response and response.text:
                    analysis = response.text.strip()
                    logger.info(f"Successfully analyzed image with Gemini Vision: {len(analysis)} chars")
                    
                    # Record success
                    self.api_key_manager.record_success(current_key)
                    self.rate_limit_manager.record_success()
                    
                    return analysis
                else:
                    logger.warning("Gemini Vision returned empty response")
                    return "No analysis could be generated for this image"
                    
            except Exception as e:
                error_str = str(e).lower()
                
                # Log error
                logger.warning(f"Vision analysis attempt {attempt + 1} failed: {str(e)}")
                
                # Check if it's a rate limit error
                if 'rate' in error_str or 'quota' in error_str or 'resource_exhausted' in error_str:
                    self.rate_limit_manager.record_rate_limit()
                    current_key = self.api_key_manager.get_active_key()
                    if current_key:
                        self.api_key_manager.record_failure(current_key, error_str)
                        self.api_key_manager.rotate_to_next_key()
                    
                    # Exponential backoff
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    await asyncio.sleep(delay)
                    continue
                    
                # For other errors, try rotating key
                current_key = self.api_key_manager.get_active_key()
                if current_key:
                    self.api_key_manager.record_failure(current_key, error_str)
                    self.api_key_manager.rotate_to_next_key()
                
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.error(f"Vision analysis failed after {max_retries} attempts: {str(e)}")
                    return f"Failed to analyze image: {str(e)}"
        
        return "Unable to analyze image after multiple attempts"

    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        max_tokens: int = 2000,
        temperature: float = 0.7
    ) -> Any:
        """
        Generate content with tool/function calling support.
        
        Args:
            prompt: The prompt for the LLM
            tools: List of tool schemas in Gemini format
            max_tokens: Maximum output tokens
            temperature: Temperature for generation
        
        Returns:
            Response object with text and/or function_calls
        """
        self._ensure_configured()
        
        max_retries = 5
        base_delay = 5
        
        for attempt in range(max_retries):
            try:
                # Get active API key
                current_key = self.api_key_manager.get_active_key()
                if not current_key:
                    logger.warning("No active API keys available for tool-use generation")
                    raise Exception("No API keys available")
                
                # Configure Gemini with current key
                genai.configure(api_key=current_key)
                
                # Convert tool schemas to Gemini format
                from google.generativeai.types import FunctionDeclaration, Tool
                
                function_declarations = []
                for tool in tools:
                    func_decl = FunctionDeclaration(
                        name=tool['name'],
                        description=tool['description'],
                        parameters=tool['parameters']
                    )
                    function_declarations.append(func_decl)
                
                gemini_tools = [Tool(function_declarations=function_declarations)]
                
                # Use Gemini 2.0 Flash model (supports function calling)
                model = genai.GenerativeModel(
                    'gemini-2.0-flash-exp',
                    tools=gemini_tools
                )
                
                logger.info(f"Generating with {len(tools)} tools available")
                
                # Generate content with tools
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    safety_settings=self.safety_settings,
                    generation_config=genai.types.GenerationConfig(
                        temperature=temperature,
                        top_p=0.95,
                        max_output_tokens=max_tokens,
                    )
                )
                
                # Record success
                self.api_key_manager.record_success(current_key)
                self.rate_limit_manager.record_success()
                
                # Check if response has function calls
                if response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'function_call'):
                                logger.info(f"🔧 LLM wants to call: {part.function_call.name}")
                
                return response
                
            except Exception as e:
                error_str = str(e)
                
                # Record failure
                if current_key:
                    self.api_key_manager.record_failure(current_key, error_str)
                self.rate_limit_manager.record_failure()
                
                # Check if we should retry
                if self.rate_limit_manager.should_retry(error_str, attempt, max_retries):
                    retry_delay = self.rate_limit_manager.get_retry_delay(error_str, attempt, base_delay)
                    
                    if self.rate_limit_manager.is_rate_limited(error_str):
                        self.api_key_manager.rotate_to_next_key()
                        logger.warning(f"Rate limit hit, rotating key and retrying in {retry_delay:.2f}s")
                    
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error(f"Non-retryable error in tool-use generation: {error_str[:200]}")
                    raise
        
        raise Exception(f"Failed to generate with tools after {max_retries} attempts")


# ==============================================================================
# BACKWARD COMPATIBILITY WRAPPER - Uses UnifiedAIClient with fallback
# ==============================================================================

class GeminiClientWrapper:
    """
    Backward-compatible wrapper that uses UnifiedAIClient with multi-tier fallback.
    
    This maintains the same interface as GeminiClient but uses the new UnifiedAIClient
    under the hood for automatic fallback across Gemini, OpenRouter, and GitHub providers.
    
    To disable old Gemini rotation and use new multi-tier system:
    1. Keep GEMINI_API_KEYS with a single key (for Tier 1)
    2. Add OPENROUTER_API_KEY (for Tier 2)
    3. Add GITHUB_TOKEN or GITHUB_TOKENS (for Tier 3/4)
    """
    
    def __init__(self):
        from services.unified_ai_client import unified_client
        self.unified_client = unified_client
        # Don't initialize old_client yet - will create on demand with single key only
        self._old_client = None
        logger.info("🔄 Using UnifiedAIClient with multi-tier fallback")
    
    def _get_old_client_for_tools(self):
        """Lazy initialization of old client with SINGLE KEY ONLY for tool calling"""
        if self._old_client is None:
            # Create a modified GeminiClient that uses only ONE key
            import os
            original_keys = os.environ.get("GEMINI_API_KEYS", "")
            
            # Temporarily set to single key
            if original_keys:
                first_key = original_keys.split(',')[0].strip()
                os.environ["GEMINI_API_KEYS"] = first_key
                logger.info("⚠️ Tool calling: Using SINGLE Gemini key (no rotation)")
            
            self._old_client = GeminiClient()
            
            # Restore original keys
            if original_keys:
                os.environ["GEMINI_API_KEYS"] = original_keys
        
        return self._old_client
    
    async def generate_content_async(self, prompt: str, max_tokens: int = 500, temperature: float = 0.7, task_type: str = 'general', quota_user: Optional[str] = None) -> str:
        """Generate content using unified multi-tier fallback with quotaUser support"""
        return await self.unified_client.generate_content_async(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            prefer_reasoning=False,
            task_type=task_type,
            quota_user=quota_user
        )
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings using GitHub's embedding model"""
        return await self.unified_client.generate_embedding(text)
    
    async def generate_summary(self, text: str, context: str = "code repository") -> str:
        """Generate summary using unified client"""
        prompt = f"""Please provide a concise summary of the following {context}:

{text}

Focus on key functionality, main components, and notable patterns."""
        
        return await self.unified_client.generate_content_async(
            prompt=prompt,
            max_tokens=1500,
            temperature=0.3
        )
    
    async def answer_question(self, question: str, context: str, files_content: List[str]) -> Dict[str, Any]:
        """Answer question using unified client"""
        combined_context = "\n\n".join(files_content[:10])  # Limit context
        
        prompt = f"""Based on the following context, answer the question:

Context:
{context}

Relevant Files:
{combined_context[:8000]}

Question: {question}

Provide a detailed, accurate answer based solely on the information provided."""
        
        answer = await self.unified_client.generate_content_async(
            prompt=prompt,
            max_tokens=2000,
            temperature=0.3
        )
        
        return {
            "answer": answer,
            "confidence": 0.85,  # Default confidence
            "sources": files_content[:5]
        }
    
    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Any],
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> Any:
        """
        Generate with tools - falls back to old Gemini client for tool calling.
        
        Tool calling is specific to Gemini API and not yet supported by
        OpenRouter/GitHub providers, so we use the old client for this.
        """
        logger.warning("⚠️ Tool calling requires Gemini - using single key (no rotation)")
        old_client = self._get_old_client_for_tools()
        return await old_client.generate_with_tools(
            prompt=prompt,
            tools=tools,
            max_tokens=max_tokens,
            temperature=temperature
        )
    
    def get_rate_limit_status(self) -> Dict[str, Any]:
        """Get status of all tiers"""
        return self.unified_client.get_status()
    
    def reset_circuit_breakers(self):
        """Reset failure counts"""
        for tier in self.unified_client.tier_failure_counts:
            self.unified_client.tier_failure_counts[tier] = 0
        logger.info("✅ Reset all tier failure counts")


# Global Gemini client instance (now uses UnifiedAIClient)
gemini_client = GeminiClientWrapper()
