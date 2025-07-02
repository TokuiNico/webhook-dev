from faststream import FastStream
from faststream.rabbit import RabbitBroker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# 創建 RabbitMQ broker
# 在開發環境中使用內存模式，生產環境使用真實 RabbitMQ
if settings.DEVELOPMENT:
    # 開發環境使用內存模式
    broker = RabbitBroker("amqp://guest:guest@localhost:5672/")
else:
    # 生產環境使用真實 RabbitMQ
    broker = RabbitBroker(settings.RABBITMQ_URL)

# 創建 FastStream 應用
stream_app = FastStream(broker)
