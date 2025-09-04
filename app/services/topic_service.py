"""
主題和來源管理服務
處理主題和來源相關的所有業務邏輯
"""

from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.db.models import Topic, Source
from app.core.signature.types import SignatureValidatorType
from app.core.config import settings


class SourceService:
    """來源管理服務類"""

    async def create_source(
        self,
        db: AsyncSession,
        name: str,
        secret: str,
        signature_validator: str = "none",
    ) -> dict:
        """
        創建新的 Webhook 來源

        Args:
            db: 數據庫會話
            name: 來源名稱（如 'github', 'stripe'）- 現在允許重複
            secret: 用於驗證的密鑰
            signature_validator: 簽名驗證器類型（'github' 或 'none'）

        Returns:
            dict: 創建的來源信息
        """
        # 創建新來源 - 移除名稱唯一性檢查
        db_source = Source(
            name=name, secret=secret, signature_validator=signature_validator
        )
        db.add(db_source)
        await db.commit()
        await db.refresh(db_source)

        return {
            "id": db_source.id,
            "name": db_source.name,
            "signature_validator": db_source.signature_validator,
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
                "signature_validator": source.signature_validator,
                "created_at": source.created_at.isoformat(),
            }
            for source in sources
        ]


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


# 全局服務實例
source_service = SourceService()
topic_service = TopicService()
