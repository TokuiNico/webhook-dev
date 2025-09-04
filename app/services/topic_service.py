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


class SourceService:
    """來源管理服務類"""

    async def create_source(
        self,
        db: AsyncSession,
        name: str,
        secret: str,
        signature_validator: SignatureValidatorType = SignatureValidatorType.GENERIC,
    ) -> dict:
        """
        創建新的 Webhook 來源

        Args:
            db: 數據庫會話
            name: 來源名稱（如 'github', 'stripe'）
            secret: 用於驗證的密鑰
            signature_validator: 簽名驗證器類型（如 'github', 'stripe', 'generic'）

        Returns:
            dict: 創建的來源信息

        Raises:
            HTTPException: 當來源名稱已存在時
        """
        # 檢查來源是否已存在
        existing_result = await db.execute(select(Source).where(Source.name == name))
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"來源名稱 '{name}' 已存在",
            )

        # 創建新來源
        db_source = Source(
            name=name, secret=secret, signature_validator=signature_validator.value
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
        self, db: AsyncSession, name: str, source_id: int, description: str = ""
    ) -> dict:
        """
        創建新的主題

        Args:
            name: 主題名稱（如 'github.push', 'stripe.payment.succeeded'）
            source_id: 所屬來源 ID
            db: 數據庫會話
            description: 主題描述

        Returns:
            dict: 創建的主題信息

        Raises:
            HTTPException: 當來源不存在或主題名稱已存在時
        """
        # 驗證來源是否存在
        source_result = await db.execute(select(Source).where(Source.id == source_id))
        if not source_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"來源 ID {source_id} 不存在",
            )

        # 檢查主題名稱是否已存在
        existing_result = await db.execute(select(Topic).where(Topic.name == name))
        if existing_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"主題名稱 '{name}' 已存在",
            )

        # 創建新主題
        db_topic = Topic(name=name, source_id=source_id, description=description)

        db.add(db_topic)
        await db.commit()
        await db.refresh(db_topic)

        return {
            "id": db_topic.id,
            "name": db_topic.name,
            "source_id": db_topic.source_id,
            "description": db_topic.description or "",
            "created_at": db_topic.created_at.isoformat(),
            "updated_at": db_topic.updated_at.isoformat(),
        }

    async def get_topics(
        self, db: AsyncSession, source_id: Optional[int] = None
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
                "updated_at": topic.updated_at.isoformat(),
                "created_at": topic.created_at.isoformat(),
            }
            for topic in topics
        ]

    async def get_topic_by_id(
        self,
        db: AsyncSession,
        topic_id: int,
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
            "updated_at": topic.updated_at.isoformat(),
            "created_at": topic.created_at.isoformat(),
        }


# 全局服務實例
source_service = SourceService()
topic_service = TopicService()
