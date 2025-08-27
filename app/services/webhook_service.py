"""
Webhook 接收和處理服務
處理 webhook 事件的接收、驗證、記錄和分發邏輯
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.signature import SignatureValidator
from app.db.models import EventLog, EventLogStatus, Source, Subscription, Topic
from app.stream.broker_manager import broker_manager
from app.stream.models import SubscriptionInfo, WebhookEvent

logger = logging.getLogger(__name__)



class WebhookService:
    """Webhook 處理服務"""

    def __init__(self):
        self.signature_validator = SignatureValidator()

    async def validate_source_and_topic(
        self, source_name: str, topic_name: str, db: AsyncSession
    ) -> Tuple[Source, Topic]:
        """
        驗證來源和主題是否存在

        Args:
            source_name: 來源名稱
            topic_name: 主題名稱
            db: 數據庫會話

        Returns:
            Tuple[Source, Topic]: 來源和主題對象

        Raises:
            HTTPException: 當來源或主題不存在時
        """
        # 驗證來源
        source_result = await db.execute(
            select(Source).where(Source.name == source_name)
        )
        source = source_result.scalar_one_or_none()
        if not source:
            logger.warning(f"❌ 未知來源: {source_name}")
            raise HTTPException(status_code=404, detail=f"來源 '{source_name}' 不存在")

        # 驗證主題
        topic_result = await db.execute(
            select(Topic).where(Topic.name == topic_name, Topic.source_id == source.id)
        )
        topic = topic_result.scalar_one_or_none()
        if not topic:
            logger.warning(f"❌ 未知主題: {topic_name} for source {source_name}")
            raise HTTPException(
                status_code=404,
                detail=f"主題 '{topic_name}' 在來源 '{source_name}' 中不存在",
            )

        return source, topic

    async def create_event_log(
        self,
        topic: Topic,
        content_type: str,
        payload: str,
        headers: Dict[str, str],
        source_ip: str,
        status: EventLogStatus,
        db: AsyncSession,
    ) -> EventLog:
        """
        創建事件記錄

        Args:
            topic: 主題對象
            content_type: 內容類型
            payload: 請求體內容
            headers: 請求頭
            source_ip: 來源IP
            status: 事件狀態
            db: 數據庫會話

        Returns:
            EventLog: 創建的事件記錄
        """
        # 將 headers 標準化為小寫鍵的字典，並確保值為字串
        normalized_headers = {str(k).lower(): str(v) for k, v in headers.items()}

        event_log = EventLog(
            topic_id=topic.id,
            content_type=content_type,
            payload=payload,
            headers=normalized_headers,
            source_ip=source_ip,
            status=status,  # 使用枚舉的值
        )

        db.add(event_log)
        await db.commit()
        await db.refresh(event_log)

        return event_log

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
        發布 webhook 事件到消息隊列

        根據 IMPLEMENTATION_PLAN.md 的架構，將事件發布到 FastStream 的 "webhook.received" 隊列
        由 FastStream handlers 處理事件分發給所有訂閱者
        """
        logger.info(f"🚀 準備發布事件到消息隊列: {event_log.id}")

        # 將 SQLAlchemy 訂閱對象轉換為 Pydantic 模型
        subscription_infos = [
            SubscriptionInfo(
                id=sub.id,  # type: ignore
                subscriber_name=sub.subscriber_name,  # type: ignore
                target_url=sub.target_url,  # type: ignore
                is_active=sub.is_active  # type: ignore
            )
            for sub in subscriptions
        ]

        # 標準化 headers：小寫鍵，字串值
        normalized_headers = {str(k).lower(): str(v) for k, v in headers.items()}

        # 創建 WebhookEvent 對象
        webhook_event = WebhookEvent(
            event_log_id=event_log.id,  # type: ignore
            topic_id=topic.id,  # type: ignore
            topic_name=topic.name,  # type: ignore
            source_name=source.name,  # type: ignore
            payload=payload,
            content_type=content_type,
            headers=normalized_headers,
            source_ip=source_ip,
            subscriptions=subscription_infos,
            received_at=datetime.utcnow()
        )

        # 發布事件到 FastStream 的 "webhook.received" 隊列
        # broker_manager 會自動處理開發/生產模式的差異
        await broker_manager.publish(webhook_event, "webhook.received")

        logger.info(
            f"✅ 事件已發布到消息隊列: {event_log.id}, "
            f"主題: {topic.name}, 訂閱數: {len(subscription_infos)}"
        )

    async def update_event_status(
        self, event_log: EventLog, status: EventLogStatus, db: AsyncSession
    ) -> None:
        """
        更新事件狀態

        Args:
            event_log: 事件記錄
            status: 新狀態
            db: 數據庫會話
        """
        # 使用 SQLAlchemy 更新記錄
        await db.execute(
            update(EventLog)
            .where(EventLog.id == event_log.id)
            .values(status=status)
        )
        await db.commit()

    async def process_webhook(
        self,
        source_name: str,
        topic_name: str,
        body: bytes,
        signature_headers: Dict[str, Optional[str]],
        content_type: str,
        headers: Dict[str, str],
        source_ip: str,
        db: AsyncSession,
    ) -> Dict[str, str]:
        """
        處理完整的 webhook 接收流程

        Args:
            source_name: 來源名稱
            topic_name: 主題名稱
            body: 請求體
            signature_headers: 簽名頭
            content_type: 內容類型
            headers: 請求頭
            source_ip: 來源IP
            db: 數據庫會話

        Returns:
            Dict[str, str]: 處理結果

        Raises:
            HTTPException: 當驗證失敗或處理錯誤時
        """
        logger.info(
            f"📨 收到 webhook - 來源: {source_name}, 主題: {topic_name}, 類型: {content_type}"
        )

        # 1. 驗證來源和主題
        source, topic = await self.validate_source_and_topic(
            source_name, topic_name, db
        )

        # 2. 創建初始事件記錄
        payload = body.decode("utf-8") if body else ""
        event_log = await self.create_event_log(
            topic=topic,
            content_type=content_type,
            payload=payload,
            headers=headers,
            source_ip=source_ip,
            status=EventLogStatus.RECEIVED,
            db=db,
        )

        # 3. 驗證簽名
        signature_valid = self.signature_validator.validate_signature(
            source_name=source_name,
            body=body,
            signature_headers=signature_headers,
            secret=str(source.secret),
        )

        if not signature_valid:
            logger.warning(f"❌ 簽名驗證失敗: {source_name}")
            await self.update_event_status(
                event_log, EventLogStatus.FAILED_VALIDATION, db
            )
            raise HTTPException(status_code=403, detail="Webhook 簽名驗證失敗")

        # 4. 簽名驗證成功，更新狀態
        logger.info(f"✅ 簽名驗證成功: {source_name}/{topic_name}")
        await self.update_event_status(event_log, EventLogStatus.QUEUED, db)

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

        return {"message": "Webhook received and queued for processing"}


# 全局服務實例
webhook_service = WebhookService()
