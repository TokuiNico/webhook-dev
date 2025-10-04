"""
主題和來源管理服務
處理主題和來源相關的所有業務邏輯
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.db.models import Topic, Source, Subscription, EventLog
from app.core.config import settings


class SourceService:
    """來源管理服務類"""

    async def create_source(
        self,
        db: AsyncSession,
        name: str,
        secret: str,
        auth_type: str = "none",
        auth_config: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """
        創建新的 Webhook 來源

        Args:
            db: 數據庫會話
            name: 來源名稱（如 'github', 'stripe'）- 現在允許重複
            secret: 用於驗證的密鑰
            auth_type: 認證類型（'signature' 或 'none'）
            auth_config: 認證配置（JSON 格式）

        Returns:
            dict: 創建的來源信息
        """
        # 創建新來源 - 移除名稱唯一性檢查
        db_source = Source(
            name=name, secret=secret, auth_type=auth_type, auth_config=auth_config
        )
        db.add(db_source)
        await db.commit()
        await db.refresh(db_source)

        return {
            "id": db_source.id,
            "name": db_source.name,
            "auth_type": db_source.auth_type,
            "auth_config": db_source.auth_config,
            "created_at": db_source.created_at.isoformat(),
        }

    async def get_sources(self, db: AsyncSession) -> List[dict]:
        """
        獲取所有來源列表

        Args:
            db: 數據庫會話

        Returns:
            List[dict]: 來源列表
        """
        result = await db.execute(select(Source).order_by(Source.name))
        sources = result.scalars().all()

        return [
            {
                "id": source.id,
                "name": source.name,
                "auth_type": source.auth_type,
                "auth_config": source.auth_config,
                "created_at": source.created_at.isoformat(),
            }
            for source in sources
        ]

    async def get_source_by_id(self, db: AsyncSession, source_id: str) -> Optional[dict]:
        """
        根據 ID 獲取單個來源詳情

        Args:
            db: 數據庫會話
            source_id: 來源 ID

        Returns:
            Optional[dict]: 來源詳情，如果不存在則返回 None
        """
        result = await db.execute(select(Source).where(Source.id == source_id))
        source = result.scalar_one_or_none()

        if source is None:
            return None

        return {
            "id": source.id,
            "name": source.name,
            "auth_type": source.auth_type,
            "auth_config": source.auth_config,
            "created_at": source.created_at.isoformat(),
            "updated_at": source.updated_at.isoformat() if source.updated_at else None,
        }

    async def update_source_by_id(
        self,
        db: AsyncSession,
        source_id: str,
        name: Optional[str] = None,
        secret: Optional[str] = None,
        auth_type: Optional[str] = None,
        auth_config: Optional[Dict[str, Any]] = None,
    ) -> Optional[dict]:
        """
        根據 ID 更新來源信息

        Args:
            db: 數據庫會話
            source_id: 來源 ID
            name: 新的來源名稱（可選）
            secret: 新的密鑰（可選）
            auth_type: 新的認證類型（可選）
            auth_config: 新的認證配置（可選）

        Returns:
            Optional[dict]: 更新後的來源詳情，如果不存在則返回 None
        """
        result = await db.execute(select(Source).where(Source.id == source_id))
        source = result.scalar_one_or_none()

        if source is None:
            return None

        # 更新提供的字段
        if name is not None:
            source.name = name
        if secret is not None:
            source.secret = secret
        if auth_type is not None:
            source.auth_type = auth_type
        if auth_config is not None:
            source.auth_config = auth_config

        # 設置更新時間
        from datetime import datetime
        source.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(source)

        return {
            "id": source.id,
            "name": source.name,
            "auth_type": source.auth_type,
            "auth_config": source.auth_config,
            "created_at": source.created_at.isoformat(),
            "updated_at": source.updated_at.isoformat() if source.updated_at else None,
        }

    async def delete_source_by_id(self, db: AsyncSession, source_id: str) -> bool:
        """
        根據 ID 刪除來源

        Args:
            db: 數據庫會話
            source_id: 來源 ID

        Returns:
            bool: 是否成功刪除
        """
        result = await db.execute(select(Source).where(Source.id == source_id))
        source = result.scalar_one_or_none()

        if source is None:
            return False

        await db.delete(source)
        await db.commit()
        return True


class TopicService:
    """主題管理服務類"""

    async def create_topic(
        self, db: AsyncSession, name: str, source_id: str, description: str = ""
    ) -> dict:
        """
        創建新的主題

        Args:
            name: 主題名稱（如 'github.push', 'stripe.payment.succeeded'）- 現在允許重複
            source_id: 所屬來源 ID (ULID)
            db: 數據庫會話
            description: 主題描述

        Returns:
            dict: 創建的主題信息

        Raises:
            HTTPException: 當來源不存在時
        """
        # 驗證來源是否存在
        source_result = await db.execute(select(Source).where(Source.id == source_id))
        if not source_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"來源 ID {source_id} 不存在",
            )

        # 創建新主題 - 移除名稱唯一性檢查
        db_topic = Topic(name=name, source_id=source_id, description=description)

        db.add(db_topic)
        await db.commit()
        await db.refresh(db_topic)

        return {
            "id": db_topic.id,
            "name": db_topic.name,
            "source_id": db_topic.source_id,
            "description": db_topic.description or "",
            "ingest_url": f"{settings.DOMAIN}/api/v1/ingest/{db_topic.id}",
            "created_at": db_topic.created_at.isoformat(),
            "updated_at": db_topic.updated_at.isoformat(),
        }

    async def get_topics(
        self, db: AsyncSession, source_id: Optional[str] = None
    ) -> List[dict]:
        """
        獲取主題列表

        Args:
            db: 數據庫會話
            source_id: 可選的來源 ID 過濾

        Returns:
            List[dict]: 主題列表
        """
        query = select(Topic)

        if source_id:
            query = query.where(Topic.source_id == source_id)

        query = query.order_by(Topic.name)
        result = await db.execute(query)
        topics = result.scalars().all()

        return [
            {
                "id": topic.id,
                "name": topic.name,
                "source_id": topic.source_id,
                "description": topic.description or "",
                "ingest_url": f"{settings.DOMAIN}/api/v1/ingest/{topic.id}",
                "updated_at": topic.updated_at.isoformat(),
                "created_at": topic.created_at.isoformat(),
            }
            for topic in topics
        ]

    async def get_topic_by_id(
        self,
        db: AsyncSession,
        topic_id: str,
    ) -> dict:
        """
        根據 ID 獲取主題

        Args:
            topic_id: 主題 ID
            db: 數據庫會話

        Returns:
            dict: 主題信息

        Raises:
            HTTPException: 當主題不存在時
        """
        result = await db.execute(select(Topic).where(Topic.id == topic_id))
        topic = result.scalar_one_or_none()

        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"主題 ID {topic_id} 不存在",
            )

        return {
            "id": topic.id,
            "name": topic.name,
            "source_id": topic.source_id,
            "description": topic.description or "",
            "ingest_url": f"{settings.DOMAIN}/api/v1/ingest/{topic.id}",
            "updated_at": topic.updated_at.isoformat(),
            "created_at": topic.created_at.isoformat(),
        }

    async def update_topic_by_id(
        self,
        db: AsyncSession,
        topic_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        source_id: Optional[str] = None,
    ) -> Optional[dict]:
        """
        根據 ID 更新主題信息

        Args:
            db: 數據庫會話
            topic_id: 主題 ID
            name: 新的主題名稱（可選）
            description: 新的主題描述（可選）
            source_id: 新的來源 ID（可選）

        Returns:
            Optional[dict]: 更新後的主題詳情，如果不存在則返回 None
        """
        result = await db.execute(select(Topic).where(Topic.id == topic_id))
        topic = result.scalar_one_or_none()

        if topic is None:
            return None

        # 更新提供的字段
        if name is not None:
            topic.name = name
        if description is not None:
            topic.description = description
        if source_id is not None:
            topic.source_id = source_id

        # 設置更新時間
        from datetime import datetime
        topic.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(topic)

        return {
            "id": topic.id,
            "name": topic.name,
            "source_id": topic.source_id,
            "description": topic.description or "",
            "ingest_url": f"{settings.DOMAIN}/api/v1/ingest/{topic.id}",
            "created_at": topic.created_at.isoformat(),
            "updated_at": topic.updated_at.isoformat(),
        }

    async def delete_topic_by_id(self, db: AsyncSession, topic_id: str) -> tuple[bool, str]:
        """
        根據 ID 刪除主題

        Args:
            db: 數據庫會話
            topic_id: 主題 ID

        Returns:
            tuple[bool, str]: (是否成功刪除, 錯誤訊息或成功訊息)
        """
        result = await db.execute(select(Topic).where(Topic.id == topic_id))
        topic = result.scalar_one_or_none()

        if topic is None:
            return False, "主題不存在"

        # 檢查是否有相關的訂閱
        subscriptions_result = await db.execute(
            select(Subscription).where(Subscription.topic_id == topic_id)
        )
        subscriptions = subscriptions_result.scalars().all()
        if subscriptions:
            return False, f"無法刪除主題：尚有 {len(subscriptions)} 個訂閱依賴此主題"

        # 檢查是否有相關的事件日誌
        event_logs_result = await db.execute(
            select(EventLog).where(EventLog.topic_id == topic_id)
        )
        event_logs = event_logs_result.scalars().all()
        if event_logs:
            return False, f"無法刪除主題：尚有 {len(event_logs)} 個事件日誌依賴此主題"

        await db.delete(topic)
        await db.commit()
        return True, "主題已成功刪除"

    async def get_topic_webhooks(
        self, db: AsyncSession, topic_id: str, skip: int = 0, limit: int = 10
    ) -> Dict[str, Any]:
        """
        獲取特定主題的 webhook 列表

        Args:
            db: 數據庫會話
            topic_id: 主題 ID
            skip: 跳過的記錄數
            limit: 返回的最大記錄數

        Returns:
            Dict[str, Any]: 包含 webhook 列表和總數的字典
        """
        # 獲取總數
        total_result = await db.execute(
            select(func.count(EventLog.id)).where(EventLog.topic_id == topic_id)
        )
        total = total_result.scalar() or 0

        # 獲取 webhook 列表
        webhooks_result = await db.execute(
            select(EventLog, Source)
            .join(Topic, EventLog.topic_id == Topic.id)
            .join(Source, Topic.source_id == Source.id)
            .where(EventLog.topic_id == topic_id)
            .order_by(EventLog.received_at.desc())
            .offset(skip)
            .limit(limit)
        )

        webhooks = [
            {
                "id": event.id,
                "source_name": source.name,
                "status": event.status.value,
                "received_at": event.received_at.isoformat(),
                "content_type": event.content_type,
            }
            for event, source in webhooks_result.all()
        ]

        return {
            "webhooks": webhooks,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    async def get_topic_subscribers(
        self, db: AsyncSession, topic_id: str, skip: int = 0, limit: int = 10
    ) -> Dict[str, Any]:
        """
        獲取訂閱特定主題的訂閱者列表

        Args:
            db: 數據庫會話
            topic_id: 主題 ID
            skip: 跳過的記錄數
            limit: 返回的最大記錄數

        Returns:
            Dict[str, Any]: 包含訂閱者列表和總數的字典
        """
        # 獲取總數
        total_result = await db.execute(
            select(func.count(Subscription.id)).where(Subscription.topic_id == topic_id)
        )
        total = total_result.scalar() or 0

        # 獲取訂閱者列表
        subscribers_result = await db.execute(
            select(Subscription)
            .where(Subscription.topic_id == topic_id)
            .order_by(Subscription.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        subscribers = [
            {
                "id": subscriber.id,
                "subscriber_name": subscriber.subscriber_name,
                "target_url": subscriber.target_url,
                "is_active": subscriber.is_active,
                "created_at": subscriber.created_at.isoformat(),
            }
            for subscriber in subscribers_result.scalars().all()
        ]

        return {
            "subscribers": subscribers,
            "total": total,
            "skip": skip,
            "limit": limit,
        }


# 全局服務實例
source_service = SourceService()
topic_service = TopicService()
