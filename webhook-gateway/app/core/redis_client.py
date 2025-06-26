"""
Redis client management for development and production environments.
"""
import redis
from app.core.config import settings

def get_redis_client():
    """
    Get Redis client based on environment settings.
    
    Returns:
        Redis client instance (real Redis or fakeredis)
    """
    if settings.USE_FAKE_REDIS and settings.DEVELOPMENT:
        try:
            import fakeredis
            return fakeredis.FakeRedis()
        except ImportError:
            print("Warning: fakeredis not installed, falling back to real Redis")
            return redis.from_url(settings.REDIS_URL)
    else:
        return redis.from_url(settings.REDIS_URL)

def get_redis_url():
    """
    Get Redis URL for Celery configuration.
    
    Returns:
        Redis URL string
    """
    if settings.USE_FAKE_REDIS and settings.DEVELOPMENT:
        # For fakeredis, we still need to return a Redis URL format
        # Celery will use the patched Redis client
        return "redis://localhost:6379/0"
    else:
        return settings.REDIS_URL

# Create a global Redis client instance
redis_client = get_redis_client() 