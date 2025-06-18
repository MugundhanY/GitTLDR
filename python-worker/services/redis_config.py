"""
Redis Configuration Service - Allows dynamic control of Redis usage across the application.
This service enables graceful degradation when Redis is not available.
"""
import asyncio
from typing import Optional, Dict, Any
from services.redis_client import redis_client
from utils.logger import get_logger

logger = get_logger(__name__)


class RedisConfigService:
    """
    Service to manage Redis usage patterns and enable graceful degradation.
    """
    
    def __init__(self):
        self.redis_available = False
        self.redis_enabled = True  # Can be disabled via environment variable
        self.last_health_check = 0
        self.health_check_interval = 30  # Check every 30 seconds
        
    async def check_redis_health(self) -> bool:
        """
        Check if Redis is available and working.
        """
        if not self.redis_enabled:
            return False
            
        try:
            await redis_client.ping()
            self.redis_available = True
            if not hasattr(self, '_redis_logged_available'):
                logger.info("Redis is available and will be used for caching")
                self._redis_logged_available = True
            return True
        except Exception as e:
            if self.redis_available:  # Only log when status changes
                logger.warning(f"Redis became unavailable: {str(e)}")
            self.redis_available = False
            self._redis_logged_available = False
            return False
    
    async def is_redis_available(self) -> bool:
        """
        Check if Redis is available with caching to avoid frequent checks.
        """
        current_time = asyncio.get_event_loop().time()
        
        # Check health periodically
        if current_time - self.last_health_check > self.health_check_interval:
            await self.check_redis_health()
            self.last_health_check = current_time
            
        return self.redis_available
    
    async def get_cached_value(self, key: str, fallback_fn=None) -> Optional[Any]:
        """
        Get a value from Redis cache with graceful fallback.
        
        Args:
            key: Redis key
            fallback_fn: Function to call if Redis is not available
            
        Returns:
            Cached value or fallback value
        """
        if await self.is_redis_available():
            try:
                value = await redis_client.get(key)
                if value:
                    logger.debug(f"Cache hit for key: {key}")
                    return value
            except Exception as e:
                logger.debug(f"Redis get failed for {key}: {str(e)}")
        
        # Use fallback if provided
        if fallback_fn:
            logger.debug(f"Using fallback for key: {key}")
            return await fallback_fn() if asyncio.iscoroutinefunction(fallback_fn) else fallback_fn()
        
        return None
    
    async def set_cached_value(self, key: str, value: Any, ex: int = 3600) -> bool:
        """
        Set a value in Redis cache with graceful failure.
        
        Args:
            key: Redis key
            value: Value to cache
            ex: Expiration time in seconds
            
        Returns:
            True if cached successfully, False otherwise
        """
        if await self.is_redis_available():
            try:
                await redis_client.set(key, value, ex=ex)
                logger.debug(f"Cached value for key: {key}")
                return True
            except Exception as e:
                logger.debug(f"Redis set failed for {key}: {str(e)}")
        
        return False
    
    async def get_hash_cached(self, key: str, fallback_fn=None) -> Dict[str, Any]:
        """
        Get a hash from Redis with graceful fallback.
        """
        if await self.is_redis_available():
            try:
                value = await redis_client.hgetall(key)
                if value:
                    logger.debug(f"Hash cache hit for key: {key}")
                    return value
            except Exception as e:
                logger.debug(f"Redis hgetall failed for {key}: {str(e)}")
        
        # Use fallback if provided
        if fallback_fn:
            logger.debug(f"Using hash fallback for key: {key}")
            return await fallback_fn() if asyncio.iscoroutinefunction(fallback_fn) else fallback_fn()
        
        return {}
    
    async def set_hash_cached(self, key: str, mapping: Dict[str, Any], ex: int = 3600) -> bool:
        """
        Set a hash in Redis with graceful failure.
        """
        if await self.is_redis_available():
            try:
                await redis_client.hset(key, mapping=mapping)
                if ex:
                    await redis_client.expire(key, ex)
                logger.debug(f"Cached hash for key: {key}")
                return True
            except Exception as e:
                logger.debug(f"Redis hset failed for {key}: {str(e)}")
        
        return False
    
    def disable_redis(self):
        """Disable Redis usage entirely."""
        self.redis_enabled = False
        self.redis_available = False
        logger.info("Redis usage disabled")
    
    def enable_redis(self):
        """Enable Redis usage."""
        self.redis_enabled = True
        logger.info("Redis usage enabled")
    
    async def get_redis_status(self) -> Dict[str, Any]:
        """Get current Redis status for monitoring."""
        await self.check_redis_health()
        
        return {
            "enabled": self.redis_enabled,
            "available": self.redis_available,
            "last_check": self.last_health_check,
            "check_interval": self.health_check_interval
        }
    
    async def get_usage_recommendations(self) -> Dict[str, Any]:
        """
        Get recommendations for Redis usage optimization.
        """
        redis_status = await self.get_redis_status()
        
        recommendations = {
            "current_status": redis_status,
            "optimization_opportunities": [],
            "architecture_suggestions": []
        }
        
        if not redis_status["available"]:
            recommendations["optimization_opportunities"].extend([
                "Application works without Redis - good architecture!",
                "Consider Redis only for performance caching",
                "Database can be primary source of truth"
            ])
        else:
            recommendations["optimization_opportunities"].extend([
                "Use Redis for file content caching (30min TTL)",
                "Use Redis for repository metadata caching (1hr TTL)", 
                "Avoid Redis for real-time streaming data",
                "Avoid Redis as primary data storage"
            ])
        
        recommendations["architecture_suggestions"] = [
            "Database-first approach: PostgreSQL as source of truth",
            "Redis as optional performance layer",
            "Direct B2 storage access with Redis caching",
            "HTTP streaming without Redis pub/sub",
            "Graceful degradation when Redis unavailable"
        ]
        
        return recommendations


# Global Redis configuration service
redis_config = RedisConfigService()
