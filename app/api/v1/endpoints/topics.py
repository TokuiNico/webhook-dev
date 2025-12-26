"""
主題和來源管理 API 端點
只處理 HTTP 路由和請求/響應，業務邏輯由服務層處理
"""

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.api.v1.deps import get_authenticated_db, get_api_key
from app.services.topic_service import source_service, topic_service
from app.services.webhook_service import webhook_service
from app.schemas.topic import TopicCreate, TopicResponse, TopicUpdate
from app.schemas.source import SourceCreate, SourceUpdate, SourceResponse

router = APIRouter(dependencies=[Depends(get_api_key)])


# Source endpoints
@router.get("/sources/", response_model=List[SourceResponse])
async def list_sources(db: AsyncSession = Depends(get_authenticated_db)) -> List[dict]:
    """
    列出所有 Webhook 來源

    **什麼是來源 (Source)？**

    來源代表發送 webhook 的外部服務，例如：
    - `github`: GitHub 的 webhook 事件
    - `stripe`: Stripe 的付款事件
    - `slack`: Slack 的機器人事件

    每個來源都有自己的驗證密鑰，用於確保 webhook 的真實性。
    """
    return await source_service.get_sources(db)


@router.post(
    "/sources/", response_model=SourceResponse, status_code=status.HTTP_201_CREATED
)
async def create_source(
    source: SourceCreate, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    創建新的 Webhook 來源

    **範例：**
    ```json
    {
        "name": "github",
        "secret": "your-github-webhook-secret"
    }
    ```

    **注意：** 密鑰用於驗證 webhook 的 HMAC 簽名，確保請求來自可信的來源。
    """
    return await source_service.create_source(
        db=db,
        name=source.name,
        secret=source.secret,
        auth_type=source.auth_type,
        auth_config=source.auth_config,
    )


@router.get("/sources/{source_id}", response_model=SourceResponse)
async def get_source(
    source_id: str, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    獲取特定來源的詳細信息
    """
    source = await source_service.get_source_by_id(db, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="來源不存在")
    return source


@router.put("/sources/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: str,
    source: SourceUpdate,
    db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    更新特定來源的信息
    """
    updated_source = await source_service.update_source_by_id(
        db=db,
        source_id=source_id,
        name=source.name,
        secret=source.secret,
        auth_type=source.auth_type,
        auth_config=source.auth_config,
    )
    if updated_source is None:
        raise HTTPException(status_code=404, detail="來源不存在")
    return updated_source


@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: str, db: AsyncSession = Depends(get_authenticated_db)
):
    """
    刪除特定來源
    """
    success = await source_service.delete_source_by_id(db, source_id)
    if not success:
        raise HTTPException(status_code=404, detail="來源不存在")
    return {"message": "來源已刪除"}


# Topic endpoints
@router.get("/topics/", response_model=List[TopicResponse])
async def list_topics(
    source_id: Optional[str] = None, db: AsyncSession = Depends(get_authenticated_db)
) -> List[dict]:
    """
    列出所有主題

    **什麼是主題 (Topic)？**

    主題是具體的事件類型，表示特定類型的 webhook 事件。主題通常以 `來源.事件` 的格式命名：

    - `github.push`: GitHub 代碼推送事件
    - `github.pull_request`: GitHub Pull Request 事件
    - `stripe.payment.succeeded`: Stripe 付款成功事件
    - `stripe.payment.failed`: Stripe 付款失敗事件

    **工作流程：**
    1. 外部服務發送 webhook 到 `/ingest/{topic_id}`
    2. 系統根據主題 ID 識別主題和來源
    3. 查找該主題的所有訂閱者
    4. 將事件異步分發給所有訂閱者

    **參數：**
    - `source_id`: 可選，只顯示特定來源的主題（ULID 格式）

    **重要更新：**
    - 現在使用 ULID 格式的 ID 而非數字
    - ingest URL 格式已改為 `/ingest/{topic_id}`
    - 每個主題回應都包含 `ingest_url` 欄位
    """
    return await topic_service.get_topics(db, source_id)


@router.post(
    "/topics/", response_model=TopicResponse, status_code=status.HTTP_201_CREATED
)
async def create_topic(
    topic: TopicCreate, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    創建新的主題

    **範例：**
    ```json
    {
        "name": "github.push",
        "source_id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        "description": "GitHub 代碼推送事件"
    }
    ```

    **命名建議：**
    - 使用點號分隔：`{service}.{event}.{sub_event}`
    - 使用小寫字母和底線
    - 保持一致性和可讀性
    """
    return await topic_service.create_topic(
        db, topic.name, topic.source_id, topic.description or ""
    )


@router.get("/topics/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: str, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """獲取特定主題的詳細信息"""
    return await topic_service.get_topic_by_id(db, topic_id)


@router.put("/topics/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: str,
    topic: TopicUpdate,
    db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """
    更新特定主題的信息
    """
    updated_topic = await topic_service.update_topic_by_id(
        db=db,
        topic_id=topic_id,
        name=topic.name,
        description=topic.description,
        source_id=topic.source_id,
    )
    if updated_topic is None:
        raise HTTPException(status_code=404, detail="主題不存在")
    return updated_topic


@router.delete("/topics/{topic_id}")
async def delete_topic(
    topic_id: str, db: AsyncSession = Depends(get_authenticated_db)
):
    """
    刪除特定主題
    """
    success, message = await topic_service.delete_topic_by_id(db, topic_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"message": message}


@router.get("/topics/{topic_id}/webhooks")
async def get_topic_webhooks(
    topic_id: str,
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_authenticated_db)
) -> Dict[str, Any]:
    """
    獲取特定主題的 webhook 列表

    **參數：**
    - `skip`: 跳過的記錄數（分頁用）
    - `limit`: 返回的最大記錄數

    **返回：**
    - webhook 列表及總數
    """
    return await topic_service.get_topic_webhooks(db, topic_id, skip, limit)


@router.get("/topics/{topic_id}/subscribers")
async def get_topic_subscribers(
    topic_id: str,
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_authenticated_db)
) -> Dict[str, Any]:
    """
    獲取訂閱特定主題的訂閱者列表

    **參數：**
    - `skip`: 跳過的記錄數（分頁用）
    - `limit`: 返回的最大記錄數

    **返回：**
    - 訂閱者列表及總數
    """
    return await topic_service.get_topic_subscribers(db, topic_id, skip, limit)


# Authentication validators info endpoint
@router.get("/auth-validators/")
async def get_auth_validators(api_key: str = Depends(get_api_key)):
    """
    獲取系統支援的簽名驗證器資訊

    **動態從實際程式碼獲取資訊**
    - 自動檢測已註冊的簽名驗證策略
    - 從各策略獲取詳細的配置資訊
    - 確保資訊與實際程式碼同步

    **回應格式：**
    ```json
    {
        "supported_sources": ["github", "none"],
        "total_validators": 2,
        "validators": [
            {
                "validator_type": "github",
                "description": "GitHub webhook 簽名驗證",
                "signature_header": "X-Hub-Signature-256",
                "format": "sha256=<hmac_signature>",
                "algorithm": "HMAC-SHA256"
            },
            {
                "validator_type": "none",
                "description": "無驗證 (開發測試用)",
                "signature_header": "None",
                "format": "不需要簽名",
                "algorithm": "None"
            }
        ]
    }
    ```
    """
    # 從實際的認證驗證器動態獲取資訊
    supported_types = webhook_service.auth_validator.get_supported_types()
    validator_info = webhook_service.auth_validator.get_validator_info()

    # 將驗證器資訊轉換為列表格式
    validators = []
    for auth_type in supported_types:
        if auth_type in validator_info:
            validators.append(validator_info[auth_type])

    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"supported_types: {supported_types}")
    logger.info(f"total_validators: {len(validators)}")
    logger.info(f"validators: {validators}")

    return {
        "supported_types": supported_types,
        "total_validators": len(validators),
        "validators": validators,
    }


# Webhook test endpoint
class WebhookTestRequest(BaseModel):
    payload: str
    content_type: str = "application/json"  # Default to JSON


class WebhookTestResponse(BaseModel):
    success: bool
    event_log_id: Optional[str] = None
    message: str
    error: Optional[str] = None


@router.post("/topics/{topic_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    topic_id: str,
    test_request: WebhookTestRequest,
    db: AsyncSession = Depends(get_authenticated_db),
):
    """
    測試 webhook 接收功能

    模擬外部服務發送 webhook 到指定主題的接收端點。
    測試事件會被標記為測試模式，不會影響統計數據。

    **參數：**
    - `payload`: 測試用的 payload 內容（字串格式）
    - `content_type`: Content-Type，支援 application/json, application/xml, application/x-www-form-urlencoded

    **範例：**
    ```json
    {
        "payload": "{\"event\": \"test\", \"data\": \"test data\"}",
        "content_type": "application/json"
    }
    ```
    """
    try:
        # 驗證主題是否存在
        topic = await topic_service.get_topic_by_id(db, topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="主題不存在")

        # 準備測試請求的 headers
        headers = {
            "content-type": test_request.content_type,
            "x-test-mode": "true",  # 標記為測試模式
        }

        # 將 payload 轉換為 bytes
        body_bytes = test_request.payload.encode("utf-8")

        # 調用 webhook 處理服務（測試模式）
        result = await webhook_service.process_webhook_by_topic_id(
            topic_id=topic_id,
            body=body_bytes,
            content_type=test_request.content_type,
            headers=headers,
            source_ip="127.0.0.1",  # 測試請求來源 IP
            db=db,
            is_test=True,  # 標記為測試事件
        )

        return WebhookTestResponse(
            success=True,
            event_log_id=result.get("event_log_id"),
            message=result.get("message", "Webhook 測試請求已成功處理"),
        )

    except HTTPException:
        # 重新拋出 HTTP 異常
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"測試 webhook 時發生錯誤: {e}")
        return WebhookTestResponse(
            success=False,
            message="測試 webhook 時發生錯誤",
            error=str(e),
        )
