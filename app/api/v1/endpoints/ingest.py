"""
Webhook 接收端點
接收來自外部服務的 webhook 請求，委託給服務層處理
"""

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_async_db
from app.services.webhook_service import webhook_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{topic_id}")
async def receive_webhook(
    topic_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    接收來自外部服務的 webhook

    支持多種內容格式：JSON, XML, Form-data
    自動處理開發/生產模式的消息分發

    Args:
        topic_id: 主題 ID (ULID 格式)
        request: FastAPI 請求對象
        db: 數據庫會話

    Returns:
        JSONResponse: 接收確認響應
    """
    try:
        # 獲取請求元數據
        client_ip = request.client.host if request.client else "unknown"
        content_type = request.headers.get("content-type", "application/octet-stream")
        headers = dict(request.headers)

        # 委託給服務層處理
        result = await webhook_service.process_webhook_by_topic_id(
            topic_id=topic_id,
            body=await request.body(),
            content_type=content_type,
            headers=headers,
            source_ip=client_ip,
            db=db,
        )

        return JSONResponse(status_code=202, content=result)

    except Exception as e:
        logger.error(f"處理 webhook 時發生錯誤: {e}")
        # 重新拋出異常，讓 FastAPI 處理 HTTP 異常
        raise


@router.get("/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "healthy", "service": "webhook-gateway", "version": "2.0"}
