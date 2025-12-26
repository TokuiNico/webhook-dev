"""
Webhook 接收和處理服務
處理 webhook 事件的接收、驗證、記錄和分發邏輯
"""

import logging
from typing import Dict, List, Tuple, Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.authentication import AuthenticationValidator
from app.db.models import EventLog, EventLogStatus, Source, Subscription, Topic
from app.taskiq.tasks import send_webhook_to_subscription
from .log_service import log_service

logger = logging.getLogger(__name__)


class WebhookService:
    """Webhook 處理服務"""

    def __init__(self):
        self.auth_validator = AuthenticationValidator()

    async def get_active_subscriptions(
        self, topic: Topic, db: AsyncSession
    ) -> List[Subscription]:
        """
        獲取主題的所有活躍訂閱

        Args:
            topic: 主題對象
            db: 數據庫會話

        Returns:
            List[Subscription]: 活躍訂閱列表
        """
        subscriptions_result = await db.execute(
            select(Subscription).where(
                Subscription.topic_id == topic.id, Subscription.is_active
            )
        )
        return list(subscriptions_result.scalars().all())

    async def publish_webhook_event(
        self,
        event_log: EventLog,
        topic: Topic,
        source: Source,
        payload: str,
        content_type: str,
        headers: Dict[str, str],
        source_ip: str,
        subscriptions: List[Subscription],
    ) -> None:
        """
        直接發送 webhook 事件給多個訂閱者

        使用 TaskIQ 為每個訂閱者創建獨立的任務，
        取代原本 FastStream 的兩層架構（webhook.received -> webhook.dispatch）
        """
        logger.info(f"🚀 準備發送事件給 {len(subscriptions)} 個訂閱者: {event_log.id}")

        # 標準化 headers：小寫鍵，字串值
        normalized_headers = {str(k).lower(): str(v) for k, v in headers.items()}

        # 直接為每個活躍訂閱者創建 TaskIQ 任務
        task_count = 0
        for subscription in subscriptions:
            # 檢查訂閱是否活躍（使用 bool() 轉換避免 SQLAlchemy Column 比較問題）
            if bool(subscription.is_active):
                # 使用 TaskIQ 發送任務到隊列
                await send_webhook_to_subscription.kiq(
                    event_log_id=str(event_log.id),
                    subscription_id=str(subscription.id),
                    target_url=subscription.target_url,
                    payload=payload,
                    content_type=content_type,
                    headers=normalized_headers,
                )
                task_count += 1

                logger.info(
                    f"📤 已排隊分發任務: 訂閱 {subscription.id} "
                    f"({subscription.subscriber_name}) -> {subscription.target_url}"
                )

        logger.info(
            f"✅ 已排隊 {task_count} 個分發任務 for event {event_log.id}, "
            f"主題: {topic.name}"
        )

    def _build_auth_config(self, source: Source) -> Dict[str, Any]:
        """
        根據來源配置構建認證配置

        Args:
            source: 來源對象

        Returns:
            Dict[str, Any]: 認證配置字典
        """
        config = {}

        # 如果有儲存的配置，使用儲存的配置
        if source.auth_config:
            config.update(source.auth_config)

        # 對於簽名驗證，確保有 secret
        if source.auth_type == "signature":
            if not source.secret:
                logger.warning(f"⚠️ 來源 {source.id} 使用簽名驗證但缺少 secret")
                raise ValueError(f"來源 {source.name} 使用簽名驗證但缺少 secret")
            config["secret"] = str(source.secret)

            # 如果沒有指定格式，根據來源名稱推測
            if "format_type" not in config:
                if source.name == "github":
                    config["format_type"] = "github"
                elif source.name == "stripe":
                    config["format_type"] = "stripe"
                else:
                    config["format_type"] = "generic"

        return config

    async def get_topic_by_id(
        self, topic_id: str, db: AsyncSession
    ) -> Tuple[Source, Topic]:
        """
        通過 topic_id 獲取主題和來源

        Args:
            topic_id: 主題 ID (ULID)
            db: 數據庫會話

        Returns:
            Tuple[Source, Topic]: 來源和主題對象

        Raises:
            HTTPException: 當主題不存在時
        """
        # 根據 topic_id 查詢主題
        topic_result = await db.execute(select(Topic).where(Topic.id == topic_id))
        topic = topic_result.scalar_one_or_none()
        if not topic:
            logger.warning(f"❌ 未知主題 ID: {topic_id}")
            raise HTTPException(status_code=404, detail=f"主題 ID '{topic_id}' 不存在")

        # 查詢關聯的來源
        source_result = await db.execute(
            select(Source).where(Source.id == topic.source_id)
        )
        source = source_result.scalar_one_or_none()
        if not source:
            logger.warning(f"❌ 主題 {topic_id} 的來源不存在")
            raise HTTPException(
                status_code=404, detail=f"主題 '{topic_id}' 的來源不存在"
            )

        return source, topic

    async def process_webhook_by_topic_id(
        self,
        topic_id: str,
        body: bytes,
        content_type: str,
        headers: Dict[str, str],
        source_ip: str,
        db: AsyncSession,
        is_test: bool = False,
    ) -> Dict[str, str]:
        """
        通過 topic_id 處理 webhook 接收流程

        Args:
            topic_id: 主題 ID (ULID)
            body: 請求體
            content_type: 內容類型
            headers: 請求頭
            source_ip: 來源IP
            db: 數據庫會話
            is_test: 是否為測試事件（預設為 False）

        Returns:
            Dict[str, str]: 處理結果

        Raises:
            HTTPException: 當驗證失敗或處理錯誤時
        """
        logger.info(f"📨 收到 webhook - 主題 ID: {topic_id}, 類型: {content_type}, 測試模式: {is_test}")

        # 1. 通過 topic_id 獲取主題和來源
        source, topic = await self.get_topic_by_id(topic_id, db)

        # 2. 創建初始事件記錄
        payload = body.decode("utf-8") if body else ""
        event_log = await log_service.create_event_log(
            db=db,
            topic_id=topic_id,
            content_type=content_type,
            payload=payload,
            headers=headers,
            source_ip=source_ip,
            status=EventLogStatus.RECEIVED,
            is_test=is_test,
        )

        # 3. 執行認證驗證
        auth_config = self._build_auth_config(source)
        auth_result = self.auth_validator.validate(
            auth_type=source.auth_type,
            body=body,
            headers=headers,
            source_ip=source_ip,
            config=auth_config,
        )

        if not auth_result.success:
            logger.warning(
                f"❌ 認證驗證失敗: topic_id={topic_id} - {auth_result.message}"
            )
            await log_service.update_event_status(
                event_log, EventLogStatus.FAILED_VALIDATION, db
            )
            raise HTTPException(
                status_code=403, detail=f"Webhook 認證失敗: {auth_result.message}"
            )

        # 4. 認證驗證成功，更新狀態
        logger.info(f"✅ 認證驗證成功: topic_id={topic_id} - {auth_result.message}")
        await log_service.update_event_status(event_log, EventLogStatus.QUEUED, db)

        # 5. 獲取訂閱並發布事件
        subscriptions = await self.get_active_subscriptions(topic, db)

        await self.publish_webhook_event(
            event_log=event_log,
            topic=topic,
            source=source,
            payload=payload,
            content_type=content_type,
            headers=headers,
            source_ip=source_ip,
            subscriptions=subscriptions,
        )

        return {
            "message": "Webhook received and queued for processing",
            "event_log_id": str(event_log.id),
        }


# 全局服務實例
webhook_service = WebhookService()
