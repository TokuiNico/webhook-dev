from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime

class SubscriptionInfo(BaseModel):
    """訂閱信息"""
    id: int
    subscriber_name: str
    target_url: str
    is_active: bool

class WebhookEvent(BaseModel):
    """Webhook 事件消息"""
    event_log_id: int
    topic_id: int
    topic_name: str
    source_name: str
    payload: str  # JSON 字符串
    content_type: str
    headers: Dict[str, Any]
    source_ip: str
    subscriptions: List[SubscriptionInfo]
    received_at: datetime

class WebhookDispatchResult(BaseModel):
    """Webhook 分發結果"""
    event_log_id: int
    subscription_id: int
    target_url: str
    success: bool
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    attempt: int = 1 