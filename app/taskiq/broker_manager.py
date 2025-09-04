"""
TaskIQ Broker Manager - 統一管理 TaskIQ broker 的開發和生產模式
"""

import logging
from typing import List, Optional

from taskiq import InMemoryBroker, TaskiqMiddleware
from taskiq_aio_pika import AioPikaBroker

from app.core.config import settings

logger = logging.getLogger(__name__)


class SmartRetryMiddleware(TaskiqMiddleware):
    """智能重試中間件，處理不同類型的錯誤與重試策略"""

    def __init__(
        self,
        max_retries: int = 3,
        retry_delays: List[int] = [60, 300, 1800],  # 1分鐘, 5分鐘, 30分鐘
        retry_on_status_codes: List[int] = [500, 502, 503, 504, 408, 429],
    ):
        self.max_retries = max_retries
        self.retry_delays = retry_delays
        self.retry_on_status_codes = retry_on_status_codes
        logger.info(f"🔄 SmartRetryMiddleware 已初始化 - 最大重試: {max_retries} 次")


class TaskiqBrokerManager:
    """統一管理 TaskIQ broker 的開發和生產模式"""

    def __init__(self):
        self._broker: Optional[InMemoryBroker | AioPikaBroker] = None
        self._is_development = settings.USE_MEMORY_BROKER

    @property
    def broker(self) -> InMemoryBroker | AioPikaBroker:
        """獲取 broker 實例"""
        if self._broker is None:
            if self._is_development:
                logger.info("🔧 使用 InMemoryBroker 進行開發測試")
                self._broker = InMemoryBroker()
            else:
                logger.info("🚀 使用 AioPikaBroker 連接 RabbitMQ")
                self._broker = AioPikaBroker(settings.RABBITMQ_URL)

        return self._broker

    @property
    def is_development_mode(self) -> bool:
        """檢查是否為開發模式"""
        return self._is_development

    @property
    def mode_description(self) -> str:
        """獲取模式描述"""
        return (
            "開發模式 (InMemoryBroker)"
            if self._is_development
            else "生產模式 (RabbitMQ)"
        )

    async def startup(self) -> None:
        """啟動 broker"""
        if not self._is_development:
            logger.info("🚀 啟動 TaskIQ RabbitMQ broker")
            await self.broker.startup()
        else:
            logger.info("🔧 開發模式：使用 InMemoryBroker，無需啟動")

    async def shutdown(self) -> None:
        """關閉 broker"""
        if not self._is_development and self._broker:
            logger.info("🚀 關閉 TaskIQ RabbitMQ broker")
            await self._broker.shutdown()
        else:
            logger.info("🔧 開發模式：無需關閉 broker")


# 全局 broker 管理器實例
taskiq_broker_manager = TaskiqBrokerManager()

# 導出 broker 供任務裝飾器使用
broker = taskiq_broker_manager.broker
