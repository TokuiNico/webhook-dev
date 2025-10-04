"""
測試資料工廠
提供創建測試資料的便利函數
"""

import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Source, Topic, Subscription, EventLog, DispatchLog, EventLogStatus, DispatchLogStatus
from app.core.ids import ulid


class TestDataFactory:
    """測試資料工廠類"""

    @staticmethod
    async def create_source(
        db: AsyncSession,
        name: str = "test_source",
        secret: str = "test_secret_123",
        auth_type: str = "signature"
    ) -> Source:
        """創建測試來源"""
        source = Source(
            id=ulid(),
            name=name,
            secret=secret,
            auth_type=auth_type,
            auth_config={"format_type": "github"} if auth_type == "signature" else None,
        )
        db.add(source)
        await db.commit()  # 提交事務確保數據保存
        await db.refresh(source)
        return source

    @staticmethod
    async def create_topic(
        db: AsyncSession,
        source: Source,
        name: str = "test_topic",
        description: str = "測試主題"
    ) -> Topic:
        """創建測試主題"""
        topic = Topic(
            id=ulid(),
            name=name,
            source_id=source.id,
            description=description,
        )
        db.add(topic)
        await db.commit()  # 提交事務確保數據保存
        await db.refresh(topic)
        return topic

    @staticmethod
    async def create_subscription(
        db: AsyncSession,
        topic: Topic,
        subscriber_name: str = "test_subscriber",
        target_url: str = "http://localhost:3000/webhook",
        is_active: bool = True
    ) -> Subscription:
        """創建測試訂閱"""
        subscription = Subscription(
            id=ulid(),
            topic_id=topic.id,
            subscriber_name=subscriber_name,
            target_url=target_url,
            is_active=is_active,
        )
        db.add(subscription)
        await db.flush()  # 確保物件有 ID 但不提交事務
        await db.refresh(subscription)
        return subscription

    @staticmethod
    async def create_event_log(
        db: AsyncSession,
        topic: Topic,
        source_ip: str = "127.0.0.1",
        content_type: str = "application/json",
        payload: str = '{"test": "data"}',
        headers: Optional[Dict[str, str]] = None,
        status: EventLogStatus = EventLogStatus.RECEIVED
    ) -> EventLog:
        """創建測試事件日誌"""
        if headers is None:
            headers = {"content-type": content_type}

        event_log = EventLog(
            id=ulid(),
            topic_id=topic.id,
            source_ip=source_ip,
            content_type=content_type,
            payload=payload,
            headers=headers,
            status=status,
            received_at=datetime.datetime.utcnow(),
        )
        db.add(event_log)
        await db.commit()  # 提交事務確保數據保存
        await db.refresh(event_log)
        return event_log

    @staticmethod
    async def create_dispatch_log(
        db: AsyncSession,
        event_log: EventLog,
        subscription: Subscription,
        status: DispatchLogStatus = DispatchLogStatus.SUCCESS,
        response_status_code: int = 200,
        response_body: str = '{"status": "success"}'
    ) -> DispatchLog:
        """創建測試派發日誌"""
        dispatch_log = DispatchLog(
            id=ulid(),
            event_log_id=event_log.id,
            subscription_id=subscription.id,
            status=status,
            response_status_code=response_status_code,
            response_body=response_body,
            dispatched_at=datetime.datetime.utcnow(),
        )
        db.add(dispatch_log)
        await db.flush()  # 確保物件有 ID 但不提交事務
        await db.refresh(dispatch_log)
        return dispatch_log


# 便利函數
async def create_test_scenario(db: AsyncSession) -> Dict[str, Any]:
    """創建完整的測試情境"""
    source = await TestDataFactory.create_source(db)
    topic = await TestDataFactory.create_topic(db, source)
    subscription = await TestDataFactory.create_subscription(db, topic)
    event_log = await TestDataFactory.create_event_log(db, topic)

    return {
        "source": source,
        "topic": topic,
        "subscription": subscription,
        "event_log": event_log,
    }
