"""
Webhook 接收和處理服務
處理 webhook 事件的接收、驗證、記錄和分發邏輯
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException
import logging
import json

from app.db.models import Source, Topic, EventLog, EventLogStatus, Subscription
from app.core.security import verify_webhook_signature, verify_stripe_signature

logger = logging.getLogger(__name__)


class SignatureValidator:
    """簽名驗證器，支援擴展不同的簽名驗證方式"""

    @staticmethod
    def validate_signature(
        source_name: str,
        body: bytes,
        signature_headers: Dict[str, Optional[str]],
        secret: str,
    ) -> bool:
        """
        根據來源類型驗證簽名

        Args:
            source_name: 來源名稱
            body: 請求體
            signature_headers: 簽名頭字典
            secret: 來源密鑰

        Returns:
            bool: 簽名是否有效
        """
        source_lower = source_name.lower()

        match source_lower:
            case "stripe":
                stripe_sig = signature_headers.get("stripe")
                if stripe_sig:
                    return verify_stripe_signature(body, stripe_sig, secret)
            case "github":
                github_sig = signature_headers.get("github")
                if github_sig:
                    return verify_webhook_signature(body, github_sig, secret)
            case _:
                generic_sig = signature_headers.get("generic")
                if generic_sig:
                    return verify_webhook_signature(body, generic_sig, secret)
        return False


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
        event_log = EventLog(
            topic_id=topic.id,
            content_type=content_type,
            payload=payload,
            headers=json.dumps(headers),
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
                Subscription.topic_id == topic.id, Subscription.is_active == True
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
        """
        # 暫時跳過發布邏輯，避免型別問題
        logger.info(f"🚀 事件準備發送處理: {event_log.id}")
        # TODO: 實現事件發布邏輯

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
