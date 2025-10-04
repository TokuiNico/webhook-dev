"""
TaskIQ 任務定義
處理 webhook 分發任務
"""

import logging
from typing import Dict, Any

import httpx

from app.db.models import DispatchLogStatus
from app.db.session import AsyncSessionLocal
from app.taskiq.broker_manager import broker

logger = logging.getLogger(__name__)


@broker.task(retry_on_error=True)
async def send_webhook_to_subscription(
    event_log_id: str,
    subscription_id: str,
    target_url: str,
    payload: str,
    content_type: str,
    headers: Dict[str, Any],
) -> Dict[str, Any]:
    """
    發送 webhook 到特定訂閱者

    Args:
        event_log_id: 事件記錄 ID
        subscription_id: 訂閱 ID
        target_url: 目標 URL
        topic_name: 主題名稱
        source_name: 來源名稱
        payload: 事件內容
        content_type: 內容類型
        headers: 原始請求頭
        source_ip: 來源 IP

    Returns:
        Dict[str, Any]: 分發結果
    """
    logger.info(
        f"🚀 分發 webhook 到 {target_url} (訂閱者: {subscription_id})"
    )

    status = DispatchLogStatus.SUCCESS
    status_code = 0
    response_body = ""
    error_message = ""

    try:
        # 準備請求頭
        request_headers = {"Content-Type": content_type}

        # 添加一些有用的原始頭信息（排除敏感信息）
        forward_headers = ["User-Agent", "X-Forwarded-For", "X-Request-ID"]
        for header in forward_headers:
            if header.lower() in headers:
                request_headers[header] = str(headers[header.lower()])

        # 添加 webhook 相關的識別頭
        request_headers.update(
            {
                "X-Webhook-Event-Id": str(event_log_id),
            }
        )

        # 發送 HTTP 請求
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                target_url, content=payload, headers=request_headers
            )

            status_code = response.status_code
            if response.is_error:
                status = DispatchLogStatus.FAILED
            response_body = response.text[:1000]  # 限制響應體大小

            if status == DispatchLogStatus.SUCCESS:
                logger.info(
                    f"✅ 成功分發 webhook 到 {target_url} "
                    f"(狀態碼: {status_code}, 訂閱者: {subscription_id})"
                )
            else:
                logger.warning(
                    f"⚠️ Webhook 回應非成功狀態碼: {status_code} "
                    f"到 {target_url} (訂閱者: {subscription_id})"
                )
                error_message = f"HTTP {status_code}: {response_body[:200]}"

    except httpx.TimeoutException as e:
        logger.error(f"⏰ 請求超時到 {target_url} (訂閱者: {subscription_id}): {e}")
        error_message = f"Request timeout: {str(e)}"

    except httpx.RequestError as e:
        logger.error(
            f"🌐 網路錯誤發送 webhook 到 {target_url} (訂閱者: {subscription_id}): {e}"
        )
        error_message = f"Network error: {str(e)}"

    except Exception as e:
        logger.error(
            f"💥 未預期錯誤發送 webhook 到 {target_url} (訂閱者: {subscription_id}): {e}"
        )
        error_message = f"Unexpected error: {str(e)}"

    response_body = response_body or error_message

    # 記錄分發結果到數據庫 - 在任務失敗前記錄，避免回滾
    try:
        await log_dispatch_result(
            event_log_id=event_log_id,
            subscription_id=subscription_id,
            status=status,
            status_code=status_code,
            response_body=response_body,
        )
    except Exception as log_error:
        # 如果日誌記錄失敗，不影響主要任務流程
        logger.warning(f"📝 記錄分發結果失敗（但任務繼續）: {log_error}")

    if status == DispatchLogStatus.FAILED:
        raise RuntimeError(error_message)

    return {
        "status": status.value,
        "status_code": status_code,
        "response_body": response_body,
        "error_message": error_message,
    }


async def log_dispatch_result(
    event_log_id: str,
    subscription_id: str,
    status: DispatchLogStatus,
    status_code: int = 0,
    response_body: str = "",
) -> None:
    """
    記錄分發結果到數據庫
    """
    from app.services.log_service import log_service
    try:
        async with AsyncSessionLocal() as db:
            await log_service.create_dispatch_log(
                db=db,
                event_log_id=event_log_id,
                subscription_id=subscription_id,
                status=status,
                response_status_code=status_code,
                response_body=response_body,
            )

            logger.info(
                f"📝 已記錄分發結果: 事件 {event_log_id}, "
                f"訂閱 {subscription_id}, "
                f"狀態: {status.value}"
            )

    except Exception as e:
        logger.error(f"💾 記錄分發結果失敗: {e}")
