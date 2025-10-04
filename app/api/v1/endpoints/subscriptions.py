"""
訂閱管理 API 端點
只處理 HTTP 路由和請求/響應，業務邏輯由服務層處理
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.v1.deps import get_authenticated_db, get_api_key
from app.services.subscription_service import subscription_service
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpdate,
    SubscriptionList,
    SubscriptionStats,
)

router = APIRouter(dependencies=[Depends(get_api_key)])


@router.post(
    "/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED
)
async def create_subscription(
    subscription: SubscriptionCreate, db: AsyncSession = Depends(get_authenticated_db)
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
    - `topic_id`: 要訂閱的主題 ID（ULID 格式）
    - `subscriber_name`: 訂閱者名稱（便於識別）
    - `target_url`: 接收 webhook 的目標 URL
    - `is_active`: 是否啟用此訂閱
    """
    return await subscription_service.create_subscription(db, subscription)


@router.get("/", response_model=SubscriptionList)
async def list_subscriptions(
    topic_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_authenticated_db),
) -> SubscriptionList:
    """
    列出所有訂閱

    **過濾選項：**
    - `topic_id`: 只顯示特定主題的訂閱（ULID 格式）
    - `is_active`: 只顯示啟用/停用的訂閱
    - `skip`, `limit`: 分頁參數
    """
    return await subscription_service.get_subscriptions(
        db=db, topic_id=topic_id, is_active=is_active, skip=skip, limit=limit
    )


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str, db: AsyncSession = Depends(get_authenticated_db)
) -> SubscriptionResponse:
    """獲取特定訂閱的詳細信息"""
    return await subscription_service.get_subscription_by_id(db, subscription_id)


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    subscription_update: SubscriptionUpdate,
    db: AsyncSession = Depends(get_authenticated_db),
) -> SubscriptionResponse:
    """
    更新訂閱設定

    可以更新目標 URL、啟用狀態等配置
    """
    return await subscription_service.update_subscription(
        db, subscription_id, subscription_update
    )


@router.delete("/{subscription_id}")
async def deactivate_subscription(
    subscription_id: str, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    停用訂閱（軟刪除）

    注意：這不會實際刪除記錄，只是將其標記為非活躍狀態。
    停用的訂閱不會再接收 webhook 事件。
    """
    return await subscription_service.deactivate_subscription(db, subscription_id)


@router.post("/{subscription_id}/activate")
async def activate_subscription(
    subscription_id: str, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """重新啟用已停用的訂閱"""
    return await subscription_service.activate_subscription(db, subscription_id)


@router.get("/{subscription_id}/stats", response_model=SubscriptionStats)
async def get_subscription_stats(
    subscription_id: str, db: AsyncSession = Depends(get_authenticated_db)
) -> SubscriptionStats:
    """
    獲取訂閱的統計數據

    **什麼是訂閱統計數據？**

    訂閱統計數據顯示了該訂閱的 webhook 派發情況，包括總派發次數、成功率和最後活動時間。
    這些數據基於派發日誌計算，可以幫助您監控訂閱的健康狀況。

    **返回的統計數據：**
    - `total_dispatches`: 總派發次數
    - `successful_dispatches`: 成功派發次數
    - `success_rate`: 成功率（百分比，0-100）
    - `last_activity`: 最後活動時間（最近一次派發的時間）

    **範例場景：**
    - 監控訂閱的健康狀況
    - 識別可能有問題的訂閱（成功率過低）
    - 查看訂閱的活躍程度
    """
    return await subscription_service.get_subscription_stats(db, subscription_id)
