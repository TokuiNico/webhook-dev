"""
TaskIQ 任務定義
處理 webhook 分發任務
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

import httpx
from taskiq import TaskiqMessage

from app.db.models import DispatchLog, DispatchLogStatus
from app.db.session import AsyncSessionLocal
from app.taskiq.broker_manager import broker

logger = logging.getLogger(__name__)


@broker.task(task_name="send_webhook_to_subscription")
async def send_webhook_to_subscription(
    event_log_id: int,
    subscription_id: int,
    subscriber_name: str,
    target_url: str,
    topic_name: str,
    source_name: str,
    payload: str,
    content_type: str,
    headers: Dict[str, Any],
    source_ip: str,
    attempt: int = 1,
) -> Dict[str, Any]:
    """
    發送 webhook 到特定訂閱者

    Args:
        event_log_id: 事件記錄 ID
        subscription_id: 訂閱 ID
        subscriber_name: 訂閱者名稱
        target_url: 目標 URL
        topic_name: 主題名稱
        source_name: 來源名稱
        payload: 事件內容
        content_type: 內容類型
        headers: 原始請求頭
        source_ip: 來源 IP
        attempt: 嘗試次數

    Returns:
        Dict[str, Any]: 分發結果
    """
    logger.info(
        f"🚀 分發 webhook 到 {target_url} (訂閱者: {subscriber_name}, 嘗試: {attempt})"
    )

    start_time = datetime.utcnow()
    success = False
    status_code = None
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
        request_headers.update({
            "X-Webhook-Source": source_name,
            "X-Webhook-Topic": topic_name,
            "X-Webhook-Event-Id": str(event_log_id),
            "X-Webhook-Attempt": str(attempt),
        })

        # 發送 HTTP 請求
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                target_url,
                content=payload,
                headers=request_headers
            )

            status_code = response.status_code
            success = status_code < 400
            response_body = response.text[:1000]  # 限制響應體大小

            if success:
                logger.info(
                    f"✅ 成功分發 webhook 到 {target_url} "
                    f"(狀態碼: {status_code}, 訂閱者: {subscriber_name})"
                )
            else:
                logger.warning(
                    f"⚠️ Webhook 回應非成功狀態碼: {status_code} "
                    f"到 {target_url} (訂閱者: {subscriber_name})"
                )
                error_message = f"HTTP {status_code}: {response_body[:200]}"

    except httpx.TimeoutException as e:
        logger.error(f"⏰ 請求超時到 {target_url} (訂閱者: {subscriber_name}): {e}")
        error_message = f"Request timeout: {str(e)}"

    except httpx.RequestError as e:
        logger.error(f"🌐 網路錯誤發送 webhook 到 {target_url} (訂閱者: {subscriber_name}): {e}")
        error_message = f"Network error: {str(e)}"

    except Exception as e:
        logger.error(f"💥 未預期錯誤發送 webhook 到 {target_url} (訂閱者: {subscriber_name}): {e}")
        error_message = f"Unexpected error: {str(e)}"

    # 記錄分發結果到數據庫
    try:
        await log_dispatch_result(
            event_log_id=event_log_id,
            subscription_id=subscription_id,
            attempt=attempt,
            success=success,
            status_code=status_code,
            response_body=response_body,
            error_message=error_message,
            dispatched_at=start_time,
        )
    except Exception as log_error:
        # 如果日誌記錄失敗，不影響主要任務流程
        logger.warning(f"📝 記錄分發結果失敗（但任務繼續）: {log_error}")

    # 如果失敗，考慮重試（簡化版本）
    if not success and attempt < 3:
        # 重試條件：網路錯誤或 5xx 伺服器錯誤
        should_retry = (
            status_code is None  # 網路錯誤
            or status_code >= 500  # 伺服器錯誤
            or status_code == 429  # 太多請求
        )

        if should_retry:
            logger.info(f"🔄 安排重試任務 (嘗試 {attempt + 1}/3)")
            # 安排重試任務
            await send_webhook_to_subscription.kiq(
                event_log_id=event_log_id,
                subscription_id=subscription_id,
                subscriber_name=subscriber_name,
                target_url=target_url,
                topic_name=topic_name,
                source_name=source_name,
                payload=payload,
                content_type=content_type,
                headers=headers,
                source_ip=source_ip,
                attempt=attempt + 1,
            )

    return {
        "success": success,
        "status_code": status_code,
        "response_body": response_body,
        "error_message": error_message,
        "attempt": attempt,
    }


async def log_dispatch_result(
    event_log_id: int,
    subscription_id: int,
    attempt: int,
    success: bool,
    status_code: int = None,
    response_body: str = "",
    error_message: str = "",
    dispatched_at: datetime = None,
) -> None:
    """
    記錄分發結果到數據庫

    Args:
        event_log_id: 事件記錄 ID
        subscription_id: 訂閱 ID
        attempt: 嘗試次數
        success: 是否成功
        status_code: HTTP 狀態碼
        response_body: 響應內容
        error_message: 錯誤信息
        dispatched_at: 分發時間
    """
    try:
        async with AsyncSessionLocal() as db:
            dispatch_log = DispatchLog(
                event_log_id=event_log_id,
                subscription_id=subscription_id,
                attempt=attempt,
                status=DispatchLogStatus.SUCCESS if success else DispatchLogStatus.FAILED,
                response_status_code=status_code or 0,
                response_body=response_body or error_message,
                dispatched_at=dispatched_at or datetime.utcnow(),
            )

            db.add(dispatch_log)
            await db.commit()

            logger.info(
                f"📝 已記錄分發結果: 事件 {event_log_id}, "
                f"訂閱 {subscription_id}, 嘗試 {attempt}, "
                f"狀態: {'成功' if success else '失敗'}"
            )

    except Exception as e:
        logger.error(f"💾 記錄分發結果失敗: {e}")
