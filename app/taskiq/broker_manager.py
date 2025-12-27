"""
TaskIQ Broker Manager - 統一管理 TaskIQ broker 的開發和生產模式
"""

import logging
from typing import Optional

from taskiq.middlewares import SmartRetryMiddleware
from taskiq import InMemoryBroker
from taskiq_aio_pika import AioPikaBroker

from app.core.config import settings

logger = logging.getLogger(__name__)


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
                self._broker = InMemoryBroker().with_middlewares(
                    SmartRetryMiddleware(
                        default_retry_count=3,
                        default_delay=1,
                        use_jitter=True,
                        use_delay_exponent=True,
                        max_delay_exponent=30,  # 開發環境用較短時間
                    )
                )
            else:
                logger.info("🚀 使用 AioPikaBroker 連接 RabbitMQ (Quorum Queue)")
                self._broker = AioPikaBroker(
                    settings.RABBITMQ_URL,
                    declare_queues_kwargs={
                        "durable": True,  # Quorum queues must be durable
                        "arguments": {"x-queue-type": "quorum"}
                    },
                ).with_middlewares(
                    SmartRetryMiddleware(
                        default_retry_count=3,
                        default_delay=60,
                        use_jitter=True,
                        use_delay_exponent=True,
                        max_delay_exponent=1800,  # 最大延遲 30 分鐘
                    )
                )

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
