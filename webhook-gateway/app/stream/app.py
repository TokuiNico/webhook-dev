"""
FastStream 應用配置
使用統一的 broker_manager 管理開發和生產模式
"""
from faststream import FastStream
from app.stream.broker_manager import broker_manager, broker
import logging

logger = logging.getLogger(__name__)

# 創建 FastStream 應用
stream_app = FastStream(broker)

logger.info(f"📡 FastStream 應用已創建 - {broker_manager.mode_description}")

# 導出供其他模塊使用
__all__ = ["stream_app", "broker", "broker_manager"]
