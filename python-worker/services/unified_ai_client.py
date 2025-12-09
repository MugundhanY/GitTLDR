"""
Unified AI Client - Multi-Tier System with Adaptive Throttling
===============================================================

ARCHITECTURE:
Primary: Gemini 2.5 Model Cascade (with quotaUser quota isolation)
  ├─ gemini-2.5-flash-lite (10 RPM/key) - Primary, fast responses
  ├─ gemini-2.5-flash (5 RPM/key) - Fallback 1, more capable
  └─ gemma-3-4b (30 RPM/key) - Fallback 2, open model with high quota

Fallback: GitHub Models (Azure AI)
  ├─ GPT-4.1 (15 RPM/token) - Quality-critical phases
  └─ GPT-4.1-mini (15 RPM/token) - Speed-optimized phases

ADAPTIVE FEATURES:
✅ Automatic model cascade (retry on rate limits)
✅ Exponential backoff (1.5x delay increase per rate limit, max 10x)
✅ Request smoothing (200ms base interval between calls)
✅ Per-issue quota isolation (quotaUser parameter)
✅ IP-level cooldown tracking (Gemini shares limits across keys)

RATE LIMIT PHILOSOPHY:
We intentionally DO NOT enforce hard API call limits because:
1. Quality > Cost: Better to use 64 calls and get it right than fail with arbitrary limits
2. Self-regulating: Adaptive throttling naturally reduces call rate when hitting limits
3. Gemini Primary: 10 RPM × 11 keys = 110 calls/min baseline capacity
4. Model Cascade: Automatic fallback to higher-quota models (gemma-3-4b: 30 RPM)
5. Issue Isolation: quotaUser prevents one heavy issue from affecting others
6. Cost-effective: Gemini 2.5 Flash Lite is free tier (generous quotas)

TYPICAL USAGE (Medium Issue):
- Understanding: 2-3 calls (GPT-4.1-mini or Gemini)
- Retrieval: 1-2 calls for context analysis
- Generation: 4-6 calls (one per file, GPT-4.1 for quality)
- Validation: 2-3 calls (requirements check, bug detection)
- Refinement: 0-2 calls (only if confidence < 85%)
Total: ~10-16 calls typical, 20-30 calls for complex issues

WHEN 64 CALLS HAPPENS:
- Multiple regeneration attempts (validation failures)
- Complex multi-file changes (10+ files)
- Extensive context retrieval (large repos)
- Self-refinement loops (low confidence)
This indicates system is working hard to get quality result - NOT a bug!

PHASE ROUTING:
- Understanding, Planning, Validation: GPT-4.1-mini (speed) or Gemini fallback
- Fix Generation, Refinement: GPT-4.1 (quality) or Gemini primary
- Meetings, Summaries: GPT-4.1-mini (efficiency) or Gemini primary
"""

import os
import asyncio
import time
from typing import Optional, List, Literal
from utils.logger import get_logger

logger = get_logger(__name__)

# Task types for phase-aware routing
TaskType = Literal[
    'understanding',      # Use mini
    'planning',          # Use mini
    'generation',        # Use full
    'refinement',        # Use full
    'validation',        # Use mini
    'pr_metadata',       # Use mini
    'meeting',           # Use mini
    'summary',           # Use mini
    'general'            # Use mini (default)
]

# Global API call tracking
API_CALL_STATS = {
    'grok_3_mini': 0,
    'grok_3': 0,
    'gemini_2_0_flash': 0,
    'total_calls': 0,
    'session_start': time.time()
}

try:
    import httpx
except ImportError:
    httpx = None
    logger.error("❌ httpx required! Install: pip install httpx")

try:
    import google.generativeai as genai
except ImportError:
    genai = None
    logger.warning("⚠️ google-generativeai not installed")


class UnifiedAIClient:
    """Phase-aware client: GPT-4.1-mini + GPT-4.1 + Gemini fallback."""
    
    def __init__(self):
        self._initialized = False
        
        # GitHub tokens (for both Grok models)
        self.github_tokens = []
        self.grok_mini_idx = 0
        self.grok_full_idx = 0
        self.github_timestamps = []  # Shared rate limit tracking
        
        # Gemini (Emergency fallback)
        self.gemini_keys = []
        self.gemini_idx = 0
        self.gemini_cooldowns = {}
        self.gemini_ip_cooldown = 0
        
        # Adaptive request smoothing based on model RPM limits
        self.last_gemini_request_time = 0
        self.min_request_interval = 0.2  # Base 200ms between requests
        self.consecutive_rate_limits = 0  # Track consecutive rate limit errors
        self.adaptive_delay_multiplier = 1.0  # Increases with rate limits
        
        # quotaUser context tracking
        self.current_quota_user = None  # Will be set by meta_controller
        
        # Client
        self.http_client = None
        self.tier_failures = {1: 0, 2: 0, 3: 0}  # mini, full, gemini
        
    def _ensure_initialized(self):
        if self._initialized:
            return
        
        # Load tokens/keys
        github_str = os.environ.get("GITHUB_TOKENS", "")
        if github_str:
            self.github_tokens = [t.strip() for t in github_str.split(',') if t.strip()]
        
        gemini_str = os.environ.get("GEMINI_API_KEYS", "")
        if gemini_str:
            self.gemini_keys = [k.strip() for k in gemini_str.split(',') if k.strip()]
        
        if httpx:
            self.http_client = httpx.AsyncClient(timeout=120.0)
        
        self._initialized = True
        
        logger.info("🚀 UnifiedAIClient: Multi-Model Gemini CASCADE + GitHub FALLBACK")
        logger.info("   ├─ PRIMARY: gemini-2.5-flash-lite (" + str(len(self.gemini_keys)) + " keys, 10 RPM/key with quotaUser)")
        logger.info("   ├─ CASCADE: gemini-2.5-flash (" + str(len(self.gemini_keys)) + " keys, 5 RPM/key) → gemma-3-4b (30 RPM/key)")
        logger.info("   ├─ FALLBACK: GPT-4.1 (" + str(len(self.github_tokens)) + " tokens) = " + str(len(self.github_tokens) * 15) + " rpm")
        logger.info("   ├─ FALLBACK: GPT-4.1-mini (" + str(len(self.github_tokens)) + " tokens) = " + str(len(self.github_tokens) * 15) + " rpm")
        logger.info("   └─ FEATURES: Adaptive throttling, model cascade, exponential backoff")
    
    def log_api_stats(self):
        """Log comprehensive API usage statistics"""
        elapsed = time.time() - API_CALL_STATS['session_start']
        elapsed_mins = elapsed / 60
        
        logger.info("\n" + "="*60)
        logger.info("📊 API USAGE STATISTICS")
        logger.info("="*60)
        logger.info(f"Total API Calls: {API_CALL_STATS['total_calls']}")
        logger.info(f"  ├─ GPT-4.1-mini: {API_CALL_STATS['grok_3_mini']} calls")
        logger.info(f"  ├─ GPT-4.1: {API_CALL_STATS['grok_3']} calls")
        logger.info(f"  └─ Gemini 2.0 Flash: {API_CALL_STATS['gemini_2_0_flash']} calls")
        logger.info(f"Session Duration: {elapsed_mins:.1f} minutes")
        if elapsed_mins > 0:
            logger.info(f"Avg Calls/Minute: {API_CALL_STATS['total_calls'] / elapsed_mins:.2f}")
        logger.info("="*60 + "\n")
    
    async def generate_content_async(
        self, 
        prompt: str, 
        max_tokens: int = 500, 
        temperature: float = 0.7, 
        prefer_reasoning: bool = False,
        task_type: TaskType = 'general',
        quota_user: Optional[str] = None  # NEW: For Gemini quotaUser attribution
    ) -> str:
        """Generate content with phase-aware model selection."""
        self._ensure_initialized()
        
        # Store quota_user for Gemini calls
        if quota_user:
            self.current_quota_user = quota_user
        
        errors = []
        
        # PRIMARY: Try Gemini first (with quotaUser for quota isolation)
        if self.tier_failures[3] < 5:  # Allow more failures for primary
            try:
                logger.debug(f"🟢 PRIMARY: Trying Gemini for {task_type}")
                result = await self._try_gemini(prompt, max_tokens, temperature, quota_user=self.current_quota_user)
                if result:
                    self.tier_failures[3] = 0
                    return result
            except Exception as e:
                errors.append(f"Gemini: {str(e)}")
                self.tier_failures[3] += 1
                logger.warning(f"❌ Gemini failed: {str(e)[:100]}")
        
        # FALLBACK: Try GitHub models based on task type
        use_grok_full = task_type in ['generation', 'refinement']
        
        if use_grok_full:
            # Quality-critical: Try GPT-4.1 → GPT-4.1-mini as fallback
            logger.debug(f"🎯 FALLBACK: Quality path for {task_type}: GPT-4.1 → GPT-4.1-mini")
            
            if self.tier_failures[2] < 3:
                try:
                    result = await self._try_gpt41_full(prompt, max_tokens, temperature)
                    if result:
                        self.tier_failures[2] = 0
                        return result
                except Exception as e:
                    errors.append(f"GPT-4.1: {str(e)}")
                    self.tier_failures[2] += 1
                    logger.warning(f"❌ GPT-4.1 failed: {str(e)[:100]}")
            
            if self.tier_failures[1] < 3:
                try:
                    result = await self._try_gpt41_mini(prompt, max_tokens, temperature)
                    if result:
                        self.tier_failures[1] = 0
                        return result
                except Exception as e:
                    errors.append(f"GPT-4.1-mini: {str(e)}")
                    self.tier_failures[1] += 1
                    logger.warning(f"❌ GPT-4.1-mini failed: {str(e)[:100]}")
        else:
            # Speed-optimized: Try GPT-4.1-mini → GPT-4.1 as fallback
            logger.debug(f"⚡ FALLBACK: Speed path for {task_type}: GPT-4.1-mini → GPT-4.1")
            
            if self.tier_failures[1] < 3:
                try:
                    result = await self._try_gpt41_mini(prompt, max_tokens, temperature)
                    if result:
                        self.tier_failures[1] = 0
                        return result
                except Exception as e:
                    errors.append(f"GPT-4.1-mini: {str(e)}")
                    self.tier_failures[1] += 1
                    logger.warning(f"❌ GPT-4.1-mini failed: {str(e)[:100]}")
            
            if self.tier_failures[2] < 3:
                try:
                    result = await self._try_gpt41_full(prompt, max_tokens, temperature)
                    if result:
                        self.tier_failures[2] = 0
                        return result
                except Exception as e:
                    errors.append(f"GPT-4.1: {str(e)}")
                    self.tier_failures[2] += 1
                    logger.warning(f"❌ GPT-4.1 failed: {str(e)[:100]}")
        
        # All tiers failed
        raise Exception(f"All tiers failed: {'; '.join(errors)}")
    
    
    async def _try_gpt41_mini(self, prompt: str, max_tokens: int, temperature: float) -> Optional[str]:
        """GPT-4.1-mini with token rotation - 15 req/key/min."""
        if not self.github_tokens or not self.http_client:
            return None
        
        logger.info(f"⚡ GPT-4.1-mini (token {self.grok_mini_idx % len(self.github_tokens) + 1}/{len(self.github_tokens)})")
        
        for attempt in range(len(self.github_tokens)):
            token_idx = (self.grok_mini_idx + attempt) % len(self.github_tokens)
            token = self.github_tokens[token_idx]
            
            try:
                await self._rate_limit_github()
                
                response = await self.http_client.post(
                    "https://models.inference.ai.azure.com/chat/completions",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4.1-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": min(max_tokens, 4000),
                        "temperature": temperature
                    },
                    timeout=90.0
                )
                
                if response.status_code == 200:
                    text = response.json()["choices"][0]["message"]["content"]
                    self.grok_mini_idx = (token_idx + 1) % len(self.github_tokens)
                    API_CALL_STATS['grok_3_mini'] += 1
                    API_CALL_STATS['total_calls'] += 1
                    logger.info(f"✅ GPT-4.1-mini: {len(text)} chars")
                    return text
                
                elif response.status_code == 429:
                    logger.debug(f"Token {token_idx + 1} rate limited, trying next")
                    continue
                
                elif response.status_code == 401:
                    logger.warning(f"Token {token_idx + 1} unauthorized")
                    continue
                    
            except Exception as e:
                logger.debug(f"GPT-4.1-mini token {token_idx + 1} error: {str(e)[:100]}")
                continue
        
        return None
    
    async def _try_gpt41_full(self, prompt: str, max_tokens: int, temperature: float) -> Optional[str]:
        """GPT-4.1 with token rotation - 15 req/key/min."""
        if not self.github_tokens or not self.http_client:
            return None
        
        logger.info(f"🎯 GPT-4.1 (token {self.grok_full_idx % len(self.github_tokens) + 1}/{len(self.github_tokens)})")
        
        for attempt in range(len(self.github_tokens)):
            token_idx = (self.grok_full_idx + attempt) % len(self.github_tokens)
            token = self.github_tokens[token_idx]
            
            try:
                await self._rate_limit_github()
                
                response = await self.http_client.post(
                    "https://models.inference.ai.azure.com/chat/completions",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={
                        "model": "gpt-4.1",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": min(max_tokens, 4000),
                        "temperature": temperature
                    },
                    timeout=90.0
                )
                
                if response.status_code == 200:
                    text = response.json()["choices"][0]["message"]["content"]
                    self.grok_full_idx = (token_idx + 1) % len(self.github_tokens)
                    API_CALL_STATS['grok_3'] += 1
                    API_CALL_STATS['total_calls'] += 1
                    logger.info(f"✅ GPT-4.1: {len(text)} chars")
                    return text
                
                elif response.status_code == 429:
                    logger.debug(f"Token {token_idx + 1} rate limited, trying next")
                    continue
                
                elif response.status_code == 401:
                    logger.warning(f"Token {token_idx + 1} unauthorized")
                    continue
                    
            except Exception as e:
                logger.debug(f"GPT-4.1 token {token_idx + 1} error: {str(e)[:100]}")
                continue
        
        return None
    
    async def _rate_limit_github(self):
        """100 calls/min rate limit."""
        now = time.time()
        self.github_timestamps = [t for t in self.github_timestamps if now - t < 60]
        
        if len(self.github_timestamps) >= 100:
            wait = 60 - (now - self.github_timestamps[0])
            if wait > 0:
                await asyncio.sleep(wait)
        
        self.github_timestamps.append(now)
    
    async def _try_gemini(self, prompt: str, max_tokens: int, temperature: float, quota_user: Optional[str] = None) -> Optional[str]:
        """
        Gemini 2.0 with quotaUser attribution via direct REST API.
        Uses REST API for full control over quotaUser query parameter.
        """
        if not self.gemini_keys:
            return None
        
        # ADAPTIVE REQUEST SMOOTHING: Exponential backoff after rate limits
        now = time.time()
        
        # Calculate adaptive delay (increases after rate limits, decreases on success)
        adaptive_interval = self.min_request_interval * self.adaptive_delay_multiplier
        
        time_since_last = now - self.last_gemini_request_time
        if time_since_last < adaptive_interval:
            wait_time = adaptive_interval - time_since_last
            if self.adaptive_delay_multiplier > 1.0:
                logger.info(f"⏱️ Adaptive throttling: waiting {wait_time*1000:.0f}ms (multiplier: {self.adaptive_delay_multiplier:.1f}x)")
            else:
                logger.debug(f"⏱️ Request smoothing: waiting {wait_time*1000:.0f}ms")
            await asyncio.sleep(wait_time)
        
        # CRITICAL FIX: Check IP-level cooldown FIRST (affects ALL keys)
        if time.time() < self.gemini_ip_cooldown:
            remaining = self.gemini_ip_cooldown - time.time()
            logger.warning(
                f"⏸️ Gemini IP rate limited - ALL {len(self.gemini_keys)} keys on cooldown "
                f"for {remaining:.1f}s more (until {time.strftime('%H:%M:%S', time.localtime(self.gemini_ip_cooldown))})"
            )
            return None
        
        # PROACTIVE ROTATION: Use next key BEFORE making call
        # This distributes load evenly across all keys
        starting_key_idx = self.gemini_idx % len(self.gemini_keys)
        
        # Build quotaUser with key-binding (critical for quota isolation)
        # Pattern: issue_fix_id_k{key_index}
        quota_user_param = None
        if quota_user:
            quota_user_param = f"{quota_user}_k{starting_key_idx}"
            logger.info(f"🟢 Gemini 2.0 (key {starting_key_idx + 1}/{len(self.gemini_keys)}, quotaUser={quota_user_param})")
        else:
            logger.info(f"🟢 Gemini 2.0 (key {starting_key_idx + 1}/{len(self.gemini_keys)})")
        
        for attempt in range(len(self.gemini_keys)):
            key_idx = (starting_key_idx + attempt) % len(self.gemini_keys)
            
            # Check cooldown
            if time.time() < self.gemini_cooldowns.get(key_idx, 0):
                logger.debug(f"⏭️ Skipping key {key_idx + 1} (cooldown: {self.gemini_cooldowns[key_idx] - time.time():.1f}s remaining)")
                continue
            
            api_key = self.gemini_keys[key_idx]
            
            # Update quotaUser for current key
            if quota_user:
                quota_user_param = f"{quota_user}_k{key_idx}"
            
            logger.debug(f"🔑 Trying key {key_idx + 1}/{len(self.gemini_keys)}")
            
            try:
                # Gemini model cascade: Try fastest first, fallback to alternatives
                # gemini-2.5-flash-lite (10 RPM) → gemini-2.5-flash (5 RPM) → gemma-3-4b (30 RPM)
                models_to_try = [
                    ("gemini-2.5-flash-lite", 10),   # Primary: Fast, high RPM quota
                    ("gemini-2.5-flash", 5),          # Fallback 1: More capable, lower RPM
                    ("gemma-3-4b", 30),               # Fallback 2: Open model, high RPM
                ]
                
                # Try each model in cascade
                model_name = models_to_try[0][0]  # Start with primary
                base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                
                # Build query parameters with API key and quotaUser
                params = {
                    "key": api_key
                }
                if quota_user_param:
                    params["quotaUser"] = quota_user_param
                
                headers = {
                    "Content-Type": "application/json",
                    "User-Agent": "GitTLDR/1.0 (AI-powered issue fixer)"
                }
                
                # Build request body
                data = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": temperature,
                        "maxOutputTokens": max_tokens
                    }
                }
                
                # Update last request time (for smoothing)
                self.last_gemini_request_time = time.time()
                
                # Try models in cascade until one succeeds
                last_error = None
                for model_idx, (model_name, rpm_limit) in enumerate(models_to_try):
                    try:
                        base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                        
                        # Make async HTTP request
                        response = await self.http_client.post(
                            base_url, 
                            params=params, 
                            headers=headers, 
                            json=data, 
                            timeout=120.0
                        )
                        
                        # Success! Break out of model cascade
                        if response.status_code == 200:
                            result_json = response.json()
                            break
                        
                        # Rate limited on this model, try next
                        if response.status_code == 429:
                            logger.warning(f"⚠️ {model_name} rate limited (HTTP 429), trying next model...")
                            if model_idx < len(models_to_try) - 1:
                                continue
                            else:
                                # Last model also rate limited
                                raise httpx.HTTPStatusError(f"All Gemini models rate limited", request=response.request, response=response)
                        
                        response.raise_for_status()
                        result_json = response.json()
                        break
                    
                    except httpx.HTTPStatusError as model_error:
                        last_error = model_error
                        if model_idx < len(models_to_try) - 1:
                            logger.warning(f"⚠️ {model_name} failed, trying next model...")
                            continue
                        else:
                            raise
                    except Exception as model_error:
                        last_error = model_error
                        if model_idx < len(models_to_try) - 1:
                            continue
                        else:
                            raise
                
                # Extract text from response
                if result_json.get('candidates') and len(result_json['candidates']) > 0:
                    candidate = result_json['candidates'][0]
                    if candidate.get('content') and candidate['content'].get('parts'):
                        text = candidate['content']['parts'][0].get('text', '')
                        if text:
                            # Rotate to NEXT key for subsequent call (round-robin)
                            self.gemini_idx = (key_idx + 1) % len(self.gemini_keys)
                            API_CALL_STATS['gemini_2_0_flash'] += 1
                            API_CALL_STATS['total_calls'] += 1
                            
                            # SUCCESS: Reset adaptive throttling
                            if self.consecutive_rate_limits > 0:
                                logger.info(f"✅ Rate limits cleared, resetting adaptive delay (was {self.adaptive_delay_multiplier:.1f}x)")
                            self.consecutive_rate_limits = 0
                            self.adaptive_delay_multiplier = 1.0
                            
                            quota_info = f" [quotaUser={quota_user_param}]" if quota_user_param else ""
                            logger.info(f"✅ Gemini key {key_idx + 1}: {len(text)} chars{quota_info} (next: key {self.gemini_idx + 1})")
                            return text
                
                logger.warning(f"⚠️ Gemini returned empty response")
                return None
            
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 or "quota" in str(e).lower() or "resource_exhausted" in str(e).lower():
                    # ADAPTIVE THROTTLING: Increase delay exponentially
                    self.consecutive_rate_limits += 1
                    self.adaptive_delay_multiplier = min(10.0, self.adaptive_delay_multiplier * 1.5)
                    logger.warning(f"⚠️ Rate limit #{self.consecutive_rate_limits}, increasing delay to {self.adaptive_delay_multiplier:.1f}x")
                    
                    # CRITICAL: Gemini uses IP-based rate limiting, not per-key
                    # When ANY key hits limit, ALL keys from same IP are rate limited
                    cooldown_until = time.time() + 180  # 3 minutes to be safe
                    self.gemini_ip_cooldown = cooldown_until  # ← Affects ALL keys
                    logger.error(
                        f"🚫 Gemini IP RATE LIMITED (HTTP {e.response.status_code}) - ALL {len(self.gemini_keys)} keys affected! "
                        f"Cooldown for 180s (until {time.strftime('%H:%M:%S', time.localtime(cooldown_until))}). "
                        f"⚠️ Gemini has IP-based rate limits varying by model (10-30 req/min shared across all keys)."
                    )
                    # Don't try other keys - they're all rate limited too
                    return None
                logger.error(f"❌ Key {key_idx + 1} HTTP error: {e.response.status_code} - {str(e)[:100]}")
                raise
            
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower() or "resource_exhausted" in str(e).lower():
                    # ADAPTIVE THROTTLING
                    self.consecutive_rate_limits += 1
                    self.adaptive_delay_multiplier = min(10.0, self.adaptive_delay_multiplier * 1.5)
                    
                    cooldown_until = time.time() + 180
                    self.gemini_ip_cooldown = cooldown_until
                    logger.error(
                        f"🚫 Gemini IP RATE LIMITED - ALL {len(self.gemini_keys)} keys affected! "
                        f"Cooldown for 180s (until {time.strftime('%H:%M:%S', time.localtime(cooldown_until))}). "
                        f"⚠️ Gemini has IP-based rate limits varying by model (10-30 req/min shared across all keys)."
                    )
                    return None
                logger.error(f"❌ Key {key_idx + 1} error: {e}")
                raise
        
        return None
    
    async def generate_embedding(self, text: str) -> List[float]:
        """GitHub embeddings with Gemini fallback."""
        self._ensure_initialized()
        
        # Try GitHub
        if self.github_tokens and self.http_client:
            try:
                token = self.github_tokens[self.github_idx % len(self.github_tokens)]
                
                if len(text) > 8000:
                    text = text[:8000]
                
                response = await self.http_client.post(
                    "https://models.inference.ai.azure.com/embeddings",
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"model": "text-embedding-3-small", "input": text, "dimensions": 768},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()["data"][0]["embedding"]
            
            except Exception as e:
                logger.debug(f"GitHub embedding failed: {str(e)[:50]}")
        
        # Fallback to Gemini REST API
        if self.gemini_keys and self.http_client:
            api_key = self.gemini_keys[0]
            if len(text) > 8000:
                text = text[:8000]
            
            try:
                base_url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
                params = {"key": api_key}
                headers = {"Content-Type": "application/json"}
                data = {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": text}]},
                    "taskType": "RETRIEVAL_DOCUMENT"
                }
                
                response = await self.http_client.post(base_url, params=params, headers=headers, json=data, timeout=30.0)
                response.raise_for_status()
                result = response.json()
                return result['embedding']['values']
            except Exception as e:
                logger.error(f"Gemini embedding failed: {e}")
        
        raise Exception("No embedding providers available")
    
    
    def generate_content_sync(self, prompt: str, max_tokens: int = 500, temperature: float = 0.7, task_type: TaskType = 'general', quota_user: Optional[str] = None) -> str:
        """Sync wrapper with task type support."""
        return asyncio.get_event_loop().run_until_complete(
            self.generate_content_async(prompt, max_tokens, temperature, task_type=task_type, quota_user=quota_user)
        )
    
    async def close(self):
        if self.http_client:
            await self.http_client.aclose()


# Global instance
unified_client = UnifiedAIClient()
