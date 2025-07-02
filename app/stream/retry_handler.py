import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from app.stream.app import broker
from app.stream.models import WebhookDispatchResult, SubscriptionInfo, WebhookEvent
from app.db.session import AsyncSessionLocal
from app.db.models import DispatchLog, DispatchLogStatus

logger = logging.getLogger(__name__)

class RetryHandler:
    def __init__(self, max_retries: int = 5, base_delay: int = 60):
        self.max_retries = max_retries
        self.base_delay = base_delay
    
    async def should_retry(self, result: WebhookDispatchResult, attempt: int) -> bool:
        """判斷是否應該重試"""
        if result.success:
            return False
        
        if attempt >= self.max_retries:
            return False
            
        # 可以根據錯誤類型決定是否重試
        if result.status_code and 400 <= result.status_code < 500:
            # 客戶端錯誤通常不應重試（除了 429）
            return result.status_code == 429
            
        return True
    
    def calculate_delay(self, attempt: int) -> int:
        """計算指數退避延遲"""
        return self.base_delay * (2 ** min(attempt, 6))  # 最大 64 倍延遲
    
    async def schedule_retry(self, event: WebhookEvent, subscription: SubscriptionInfo, attempt: int):
        """安排重試任務"""
        delay = self.calculate_delay(attempt)
        
        logger.info(f"Scheduling retry {attempt} for subscription {subscription.id} in {delay} seconds")
        
        # 記錄重試狀態
        async with AsyncSessionLocal() as db:
            retry_log = DispatchLog(
                event_log_id=event.event_log_id,
                subscription_id=subscription.id,
                attempt=attempt,
                status=DispatchLogStatus.RETRYING,
                response_status_code=0,
                response_body=f"Scheduled retry in {delay} seconds",
                dispatched_at=datetime.utcnow()
            )
            db.add(retry_log)
            await db.commit()
        
        # 發布延遲重試事件
        await asyncio.sleep(delay)
        await broker.publish({
            "event": event.dict(),
            "subscription": subscription.dict(),
            "attempt": attempt
        }, "webhook.retry")

retry_handler = RetryHandler() 