import httpx
import logging
from datetime import datetime

from app.stream.broker_manager import broker, broker_manager
from app.stream.models import WebhookEvent, WebhookDispatchResult, SubscriptionInfo
from app.db.session import AsyncSessionLocal
from app.db.models import DispatchLog, DispatchLogStatus
from app.stream.retry_handler import retry_handler

logger = logging.getLogger(__name__)

@broker.subscriber("webhook.received")
async def process_webhook_event(event: WebhookEvent):
    """
    處理接收到的 webhook 事件
    將事件分發給所有訂閱者
    """
    logger.info(f"📨 處理 webhook 事件 {event.event_log_id} for topic {event.topic_name}")

    # 並行發送給所有訂閱者
    for subscription in event.subscriptions:
        if subscription.is_active:
            # 為每個訂閱者發布分發任務（初始化 attempt=1）
            await broker_manager.publish(
                {
                    "event": event.model_dump(),
                    "subscription": subscription.model_dump(),
                    "attempt": 1,
                },
                "webhook.dispatch"
            )
            logger.info(f"📤 已排隊分發任務: 訂閱 {subscription.id} ({subscription.subscriber_name})")

    logger.info(f"✅ 已排隊 {len(event.subscriptions)} 個分發任務 for event {event.event_log_id}")

@broker.subscriber("webhook.dispatch")
async def dispatch_to_subscriber(message: dict):
    """
    將 webhook 發送給特定訂閱者
    """
    event_data = WebhookEvent(**message["event"])
    subscription_data = SubscriptionInfo(**message["subscription"])
    attempt = int(message.get("attempt", 1))

    logger.info(f"🚀 分發 webhook 到 {subscription_data.target_url} (attempt={attempt})")

    result = await send_webhook_to_subscriber(event_data, subscription_data)
    # 設置本次嘗試次數
    result.attempt = attempt

    # 記錄分發結果到數據庫
    await log_dispatch_result(result)

    if result.success:
        logger.info(f"✅ 成功分發 webhook 到 {subscription_data.target_url}")
    else:
        logger.error(f"❌ 分發失敗 webhook 到 {subscription_data.target_url}: {result.error_message}")
        # 重試判斷與排程
        if await retry_handler.should_retry(result, attempt):
            await retry_handler.schedule_retry(event_data, subscription_data, attempt + 1)

@broker.subscriber("webhook.retry")
async def dispatch_retry(message: dict):
    """
    重試 webhook 分發
    """
    event_data = WebhookEvent(**message["event"])
    subscription_data = SubscriptionInfo(**message["subscription"])
    attempt = int(message.get("attempt", 2))

    logger.info(f"🔁 重試分發 webhook 到 {subscription_data.target_url} (attempt={attempt})")

    result = await send_webhook_to_subscriber(event_data, subscription_data)
    result.attempt = attempt

    await log_dispatch_result(result)

    if not result.success:
        if await retry_handler.should_retry(result, attempt):
            await retry_handler.schedule_retry(event_data, subscription_data, attempt + 1)

async def send_webhook_to_subscriber(
    event: WebhookEvent,
    subscription: SubscriptionInfo
) -> WebhookDispatchResult:
    """
    發送 HTTP 請求到訂閱者
    """
    try:
        # 準備請求頭
        headers = {"Content-Type": event.content_type}

        # 添加一些有用的原始頭信息（排除敏感信息）
        forward_headers = ["User-Agent", "X-Forwarded-For", "X-Request-ID"]
        for header in forward_headers:
            if header.lower() in event.headers:
                headers[header] = event.headers[header.lower()]

        # 發送 HTTP 請求
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                subscription.target_url,
                content=event.payload,
                headers=headers
            )

            success = response.status_code < 400
            response_body = response.text[:1000]  # 限制響應體大小

            return WebhookDispatchResult(
                event_log_id=event.event_log_id,
                subscription_id=subscription.id,
                target_url=subscription.target_url,
                success=success,
                status_code=response.status_code,
                response_body=response_body
            )

    except httpx.RequestError as e:
        logger.error(f"🌐 網路錯誤發送 webhook 到 {subscription.target_url}: {e}")
        return WebhookDispatchResult(
            event_log_id=event.event_log_id,
            subscription_id=subscription.id,
            target_url=subscription.target_url,
            success=False,
            error_message=f"Network error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"💥 未預期錯誤發送 webhook 到 {subscription.target_url}: {e}")
        return WebhookDispatchResult(
            event_log_id=event.event_log_id,
            subscription_id=subscription.id,
            target_url=subscription.target_url,
            success=False,
            error_message=f"Unexpected error: {str(e)}"
        )

async def log_dispatch_result(result: WebhookDispatchResult):
    """
    記錄分發結果到數據庫
    """
    try:
        async with AsyncSessionLocal() as db:
            dispatch_log = DispatchLog(
                event_log_id=result.event_log_id,
                subscription_id=result.subscription_id,
                attempt=result.attempt,
                status=DispatchLogStatus.SUCCESS if result.success else DispatchLogStatus.FAILED,
                response_status_code=result.status_code or 0,
                response_body=result.response_body or result.error_message or "",
                dispatched_at=datetime.utcnow()
            )

            db.add(dispatch_log)
            await db.commit()

    except Exception as e:
        logger.error(f"💾 記錄分發結果失敗: {e}")
