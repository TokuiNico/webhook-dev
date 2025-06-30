import httpx
import logging
from datetime import datetime
from typing import List

from faststream import Depends
from app.stream.app import broker
from app.stream.models import WebhookEvent, WebhookDispatchResult, SubscriptionInfo
from app.db.session import AsyncSessionLocal
from app.db.models import DispatchLog, DispatchLogStatus
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

@broker.subscriber("webhook.received")
async def process_webhook_event(event: WebhookEvent):
    """
    處理接收到的 webhook 事件
    將事件分發給所有訂閱者
    """
    logger.info(f"Processing webhook event {event.event_log_id} for topic {event.topic_name}")
    
    # 並行發送給所有訂閱者
    for subscription in event.subscriptions:
        if subscription.is_active:
            # 為每個訂閱者發布分發任務
            await broker.publish(
                {
                    "event": event.dict(),
                    "subscription": subscription.dict()
                },
                "webhook.dispatch"
            )
            logger.info(f"Queued dispatch to subscription {subscription.id} ({subscription.subscriber_name})")
    
    logger.info(f"Queued {len(event.subscriptions)} dispatch tasks for event {event.event_log_id}")

@broker.subscriber("webhook.dispatch")
async def dispatch_to_subscriber(message: dict):
    """
    將 webhook 發送給特定訂閱者
    """
    event_data = WebhookEvent(**message["event"])
    subscription_data = SubscriptionInfo(**message["subscription"])
    
    logger.info(f"Dispatching webhook to {subscription_data.target_url}")
    
    result = await send_webhook_to_subscriber(event_data, subscription_data)
    
    # 記錄分發結果到數據庫
    await log_dispatch_result(result)
    
    if result.success:
        logger.info(f"Successfully dispatched webhook to {subscription_data.target_url}")
    else:
        logger.error(f"Failed to dispatch webhook to {subscription_data.target_url}: {result.error_message}")

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
        logger.error(f"Network error sending webhook to {subscription.target_url}: {e}")
        return WebhookDispatchResult(
            event_log_id=event.event_log_id,
            subscription_id=subscription.id,
            target_url=subscription.target_url,
            success=False,
            error_message=f"Network error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error sending webhook to {subscription.target_url}: {e}")
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
        logger.error(f"Failed to log dispatch result: {e}") 