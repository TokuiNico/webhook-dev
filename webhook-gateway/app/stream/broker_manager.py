"""
Broker Manager - 統一管理 FastStream broker 的開發和生產模式
"""
import logging
from typing import Any, Optional
from faststream.rabbit import RabbitBroker, TestRabbitBroker
from app.core.config import settings

logger = logging.getLogger(__name__)

class BrokerManager:
    """統一管理 FastStream broker 的開發和生產模式"""

    def __init__(self):
        self._broker: Optional[RabbitBroker] = None
        self._is_development = settings.DISABLE_BROKER and settings.DEVELOPMENT

    @property
    def broker(self) -> RabbitBroker:
        """獲取 broker 實例"""
        if self._broker is None:
            self._broker = RabbitBroker(settings.RABBITMQ_URL)
        return self._broker

    @property
    def is_development_mode(self) -> bool:
        """檢查是否為開發模式"""
        return self._is_development

    @property
    def mode_description(self) -> str:
        """獲取模式描述"""
        return "開發模式 (內存測試)" if self._is_development else "生產模式 (RabbitMQ)"

    async def start(self) -> None:
        """啟動 broker"""
        if self._is_development:
            logger.info("🔧 開發模式：跳過 RabbitMQ 連接，使用內存測試模式")
            # 開發模式不需要啟動真實連接
            pass
        else:
            logger.info("🚀 生產模式：啟動 RabbitMQ broker")
            await self.broker.start()

    async def close(self) -> None:
        """關閉 broker"""
        if not self._is_development and self._broker:
            await self._broker.close()
            logger.info("🚀 生產模式：RabbitMQ broker 已關閉")
        else:
            logger.info("🔧 開發模式：無需關閉 broker")

    async def publish(self, message: Any, queue: str) -> None:
        """發布消息（統一處理開發和生產模式）"""
        if self._is_development:
            await self._publish_development_mode(message, queue)
        else:
            await self._publish_production_mode(message, queue)

    async def _publish_development_mode(self, message: Any, queue: str) -> None:
        """開發模式：使用內存測試直接處理"""
        logger.info(f"🔧 開發模式：處理消息到隊列 '{queue}'")

        # 使用 TestRabbitBroker 進行內存測試
        async with TestRabbitBroker(self.broker) as test_broker:
            await test_broker.publish(message, queue)
            logger.info(f"🔧 開發模式：消息已在內存中處理完成")

    async def _publish_production_mode(self, message: Any, queue: str) -> None:
        """生產模式：發布到真實 RabbitMQ"""
        await self.broker.publish(message, queue)
        logger.info(f"🚀 生產模式：消息已發布到 RabbitMQ 隊列 '{queue}'")

# 全局 broker 管理器實例
broker_manager = BrokerManager()

# 導出 broker 供裝飾器使用
broker = broker_manager.broker
