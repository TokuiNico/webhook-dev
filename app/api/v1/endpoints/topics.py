"""
主題和來源管理 API 端點
只處理 HTTP 路由和請求/響應，業務邏輯由服務層處理
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.v1.deps import get_authenticated_db, get_api_key
from app.services.topic_service import source_service, topic_service
from app.services.webhook_service import webhook_service
from app.schemas.topic import TopicCreate, TopicResponse
from app.schemas.source import SourceCreate, SourceResponse

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
    return await source_service.create_source(db, source.name, source.secret)


# Topic endpoints
@router.get("/topics/", response_model=List[TopicResponse])
async def list_topics(
    source_id: Optional[int] = None, db: AsyncSession = Depends(get_authenticated_db)
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
    1. 外部服務發送 webhook 到 `/ingest/{source_name}/{topic_name}`
    2. 系統驗證來源並識別主題
    3. 查找該主題的所有訂閱者
    4. 將事件異步分發給所有訂閱者

    **參數：**
    - `source_id`: 可選，只顯示特定來源的主題
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
        "source_id": 1,
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
    topic_id: int, db: AsyncSession = Depends(get_authenticated_db)
) -> dict:
    """獲取特定主題的詳細信息"""
    return await topic_service.get_topic_by_id(db, topic_id)


# Signature validators info endpoint
@router.get("/signature-validators/")
async def get_signature_validators(api_key: str = Depends(get_api_key)):
    """
    獲取系統支援的簽名驗證器資訊

    **動態從實際程式碼獲取資訊**
    - 自動檢測已註冊的簽名驗證策略
    - 從各策略獲取詳細的配置資訊
    - 確保資訊與實際程式碼同步

    **回應格式：**
    ```json
    {
        "supported_sources": ["github", "stripe", "generic"],
        "total_validators": 3,
        "validators": [
            {
                "validator_type": "github",
                "description": "GitHub webhook 簽名驗證",
                "signature_header": "X-Hub-Signature-256",
                "format": "sha256=<hmac_signature>",
                "algorithm": "HMAC-SHA256"
            }
        ]
    }
    ```
    """
    # 從實際的簽名驗證器動態獲取資訊
    supported_sources = webhook_service.signature_validator.get_supported_sources()
    validator_info = webhook_service.signature_validator.get_validator_info()

    # 將驗證器資訊轉換為列表格式
    validators = []
    for source in supported_sources:
        if source in validator_info:
            validators.append(validator_info[source])

    return {
        "supported_sources": supported_sources,
        "total_validators": len(validators),
        "validators": validators,
    }
