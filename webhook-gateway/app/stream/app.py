from faststream import FastStream
from faststream.redis import RedisBroker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# 創建 Redis broker
# 在開發環境中使用 FakeRedis，生產環境使用真實 Redis
if settings.USE_FAKE_REDIS:
    # 開發環境使用 FakeRedis
    broker = RedisBroker("redis://fake")
else:
    # 生產環境使用真實 Redis
    broker = RedisBroker(settings.REDIS_URL)

# 創建 FastStream 應用
stream_app = FastStream(broker) 