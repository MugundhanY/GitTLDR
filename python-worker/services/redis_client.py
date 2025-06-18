"""
Redis client for queue management.
"""
import json
from typing import Dict, Any, Optional, List
import redis.asyncio as redis
from config.settings import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class RedisClient:
    """Redis client for task queue management."""

    def __init__(self):
        self.settings = get_settings()
        self.redis: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.redis = redis.from_url(
                self.settings.redis_url,
                decode_responses=True,
                retry_on_timeout=True
            )
            await self.redis.ping()
            logger.info("Connected to Redis", url=self.settings.redis_url)
        except Exception as e:
            logger.error("Failed to connect to Redis", error=str(e))
            raise

    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
            logger.info("Disconnected from Redis")

    async def ping(self) -> bool:
        """Test Redis connection."""
        if not self.redis:
            return False
        try:
            await self.redis.ping()
            return True
        except Exception as e:
            logger.error("Redis ping failed", error=str(e))
            return False

    async def push_task(self, task_data: Dict[str, Any]) -> str:
        """Push a task to the queue."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")

        task_json = json.dumps(task_data)
        task_id = await self.redis.lpush(self.settings.queue_name, task_json)

        logger.info(
            "Task pushed to queue",
            task_id=task_id,
            task_type=task_data.get("type")
        )
        return str(task_id)

    async def pop_task(self, timeout: int = 30) -> Optional[Dict[str, Any]]:
        """Pop a task from the queue."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")

        result = await self.redis.brpop(self.settings.queue_name, timeout=timeout)
        if not result:
            return None

        _, task_json = result
        task_data = json.loads(task_json)

        logger.info(
            "Task popped from queue",
            task_id=task_data.get("id"),
            task_type=task_data.get("type")
        )
        return task_data

    async def update_task_status(
        self, task_id: str, status: str, result: Optional[Dict[str, Any]] = None
    ) -> None:
        """Update task status."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")

        status_key = f"task:{task_id}:status"
        result_key = f"task:{task_id}:result"

        await self.redis.set(status_key, status, ex=3600)  # Expire in 1 hour

        if result:
            await self.redis.set(result_key, json.dumps(result), ex=3600)

        logger.info("Task status updated", task_id=task_id, status=status)

    async def get_task_status(self, task_id: str) -> Optional[str]:
        """Get task status."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")

        status_key = f"task:{task_id}:status"
        return await self.redis.get(status_key)

    async def hset(self, key: str, mapping: Dict[str, Any]) -> None:
        """Set hash fields."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")
        await self.redis.hset(key, mapping=mapping)

    async def hgetall(self, key: str) -> Dict[str, str]:
        """Get all hash fields."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")
        return await self.redis.hgetall(key)

    async def lpush(self, key: str, *values) -> int:
        """Push values to list."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")
        return await self.redis.lpush(key, *values)
    
    async def publish(self, channel: str, message: str) -> None:
        """Publish message to channel."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")
        await self.redis.publish(channel, message)

    async def keys(self, pattern: str) -> List[str]:
        """Get keys matching pattern."""
        if not self.redis:
            raise RuntimeError("Redis client not connected")
        return await self.redis.keys(pattern)


# Global Redis client instance
redis_client = RedisClient()
