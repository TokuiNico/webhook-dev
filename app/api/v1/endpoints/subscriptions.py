"""
訂閱管理 API 端點
只處理 HTTP 路由和請求/響應，業務邏輯由服務層處理
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.v1.deps import get_authenticated_db
from app.services.subscription_service import subscription_service
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpdate,
    SubscriptionList
)

router = APIRouter()

@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    subscription: SubscriptionCreate,
    db: AsyncSession = Depends(get_authenticated_db)
) -> SubscriptionResponse:
    """
    創建新的訂閱

    **什麼是訂閱 (Subscription)？**

    訂閱是指定某個服務要接收特定主題 (Topic) 事件的配置。當該主題有新的 webhook 事件時，
    系統會自動將事件數據發送到訂閱中指定的目標 URL。

    **範例場景：**
    - 您的電商服務想要接收 Stripe 的付款成功通知
    - 您需要訂閱 `stripe.payment.succeeded` 主題
    - 當有付款完成時，webhook 會自動發送到您的服務端點

    **參數說明：**
    - `topic_id`: 要訂閱的主題 ID
    - `subscriber_name`: 訂閱者名稱（便於識別）
    - `target_url`: 接收 webhook 的目標 URL
    - `is_active`: 是否啟用此訂閱
    """
    return await subscription_service.create_subscription(subscription, db)

@router.get("/", response_model=SubscriptionList)
async def list_subscriptions(
    topic_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_authenticated_db)
) -> SubscriptionList:
    """
    列出所有訂閱

    **過濾選項：**
    - `topic_id`: 只顯示特定主題的訂閱
    - `is_active`: 只顯示啟用/停用的訂閱
    - `skip`, `limit`: 分頁參數
    """
    return await subscription_service.get_subscriptions(
        db=db,
        topic_id=topic_id,
        is_active=is_active,
        skip=skip,
        limit=limit
    )

@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_authenticated_db)
) -> SubscriptionResponse:
    """獲取特定訂閱的詳細信息"""
    return await subscription_service.get_subscription_by_id(subscription_id, db)

@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: int,
    subscription_update: SubscriptionUpdate,
    db: AsyncSession = Depends(get_authenticated_db)
) -> SubscriptionResponse:
    """
    更新訂閱設定

    可以更新目標 URL、啟用狀態等配置
    """
    return await subscription_service.update_subscription(
        subscription_id, subscription_update, db
    )

@router.delete("/{subscription_id}")
async def deactivate_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    停用訂閱（軟刪除）

    注意：這不會實際刪除記錄，只是將其標記為非活躍狀態。
    停用的訂閱不會再接收 webhook 事件。
    """
    return await subscription_service.deactivate_subscription(subscription_id, db)

@router.post("/{subscription_id}/activate")
async def activate_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """重新啟用已停用的訂閱"""
    return await subscription_service.activate_subscription(subscription_id, db)
