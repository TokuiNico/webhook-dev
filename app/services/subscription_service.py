"""
訂閱管理服務
處理訂閱相關的所有業務邏輯
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.db.models import Subscription, Topic
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionList,
)


class SubscriptionService:
    """訂閱管理服務類"""

    async def create_subscription(
        self,
        db: AsyncSession,
        subscription_data: SubscriptionCreate,
    ) -> SubscriptionResponse:
        """
        創建新的訂閱

        Args:
            db: 數據庫會話
            subscription_data: 訂閱創建數據

        Returns:
            SubscriptionResponse: 創建的訂閱信息

        Raises:
            HTTPException: 當主題不存在時
        """
        # 驗證主題是否存在
        await self._validate_topic_exists(subscription_data.topic_id, db)

        # 創建訂閱記錄
        db_subscription = Subscription(
            topic_id=subscription_data.topic_id,
            subscriber_name=subscription_data.subscriber_name,
            target_url=str(subscription_data.target_url),
            is_active=subscription_data.is_active,
        )

        db.add(db_subscription)
        await db.commit()
        await db.refresh(db_subscription)

        return SubscriptionResponse.model_validate(db_subscription)

    async def get_subscriptions(
        self,
        db: AsyncSession,
        topic_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> SubscriptionList:
        """
        獲取訂閱列表

        Args:
            db: 數據庫會話
            topic_id: 可選的主題 ID 過濾
            is_active: 可選的活躍狀態過濾
            skip: 跳過的記錄數（分頁）
            limit: 限制的記錄數（分頁）

        Returns:
            SubscriptionList: 訂閱列表和總數
        """
        # 構建查詢
        query = select(Subscription)
        count_query = select(func.count(Subscription.id))

        # 應用過濾條件
        if topic_id is not None:
            query = query.where(Subscription.topic_id == topic_id)
            count_query = count_query.where(Subscription.topic_id == topic_id)

        if is_active is not None:
            query = query.where(Subscription.is_active == is_active)
            count_query = count_query.where(Subscription.is_active == is_active)

        # 應用分頁
        query = query.offset(skip).limit(limit).order_by(Subscription.created_at.desc())

        # 執行查詢
        result = await db.execute(query)
        subscriptions = result.scalars().all()

        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

        return SubscriptionList(
            items=[SubscriptionResponse.model_validate(sub) for sub in subscriptions],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def get_subscription_by_id(
        self, db: AsyncSession, subscription_id: str
    ) -> SubscriptionResponse:
        """
        根據 ID 獲取訂閱

        Args:
            subscription_id: 訂閱 ID
            db: 數據庫會話

        Returns:
            SubscriptionResponse: 訂閱信息

        Raises:
            HTTPException: 當訂閱不存在時
        """
        subscription = await self._get_subscription_or_404(subscription_id, db)
        return SubscriptionResponse.model_validate(subscription)

    async def update_subscription(
        self,
        db: AsyncSession,
        subscription_id: str,
        subscription_data: SubscriptionUpdate,
    ) -> SubscriptionResponse:
        """
        更新訂閱

        Args:
            subscription_id: 訂閱 ID
            subscription_data: 更新數據
            db: 數據庫會話

        Returns:
            SubscriptionResponse: 更新後的訂閱信息

        Raises:
            HTTPException: 當訂閱不存在時
        """
        db_subscription = await self._get_subscription_or_404(subscription_id, db)

        # 更新字段
        update_data = subscription_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "target_url" and hasattr(value, "__str__"):
                value = str(value)
            setattr(db_subscription, field, value)

        await db.commit()
        await db.refresh(db_subscription)

        return SubscriptionResponse.model_validate(db_subscription)

    async def deactivate_subscription(
        self, db: AsyncSession, subscription_id: str
    ) -> dict:
        """
        停用訂閱（軟刪除）

        Args:
            subscription_id: 訂閱 ID
            db: 數據庫會話

        Returns:
            dict: 操作結果消息

        Raises:
            HTTPException: 當訂閱不存在時
        """
        subscription = await self._get_subscription_or_404(subscription_id, db)
        # 直接操作數據庫記錄而非 SQLAlchemy 對象屬性
        await db.execute(select(Subscription).where(Subscription.id == subscription_id))
        subscription.is_active = False  # type: ignore
        await db.commit()

        return {"message": f"訂閱 {subscription_id} 已成功停用"}

    async def activate_subscription(
        self, db: AsyncSession, subscription_id: str
    ) -> dict:
        """
        啟用訂閱

        Args:
            subscription_id: 訂閱 ID
            db: 數據庫會話

        Returns:
            dict: 操作結果消息

        Raises:
            HTTPException: 當訂閱不存在時
        """
        subscription = await self._get_subscription_or_404(subscription_id, db)
        subscription.is_active = True  # type: ignore
        await db.commit()

        return {"message": f"訂閱 {subscription_id} 已成功啟用"}

    # 私有方法
    async def _validate_topic_exists(self, topic_id: str, db: AsyncSession) -> None:
        """驗證主題是否存在"""
        topic_result = await db.execute(select(Topic).where(Topic.id == topic_id))
        if not topic_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"主題 ID {topic_id} 不存在",
            )

    async def _get_subscription_or_404(
        self, subscription_id: str, db: AsyncSession
    ) -> Subscription:
        """獲取訂閱或拋出 404 錯誤"""
        result = await db.execute(
            select(Subscription).where(Subscription.id == subscription_id)
        )
        subscription = result.scalar_one_or_none()

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"訂閱 ID {subscription_id} 不存在",
            )

        return subscription


# 全局服務實例
subscription_service = SubscriptionService()
