"""
日誌相關的 Pydantic 模型
"""

from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.db.models import EventLogStatus, DispatchLogStatus


class EventLogResponse(BaseModel):
    """事件日誌響應模型"""
    id: str
    topic_id: str
    source_ip: Optional[str] = None
    headers: Optional[dict] = None
    content_type: Optional[str] = None
    payload: Optional[str] = None
    status: EventLogStatus
    received_at: datetime

    class Config:
        from_attributes = True


class DispatchLogResponse(BaseModel):
    """派發日誌響應模型"""
    id: str
    event_log_id: str
    subscription_id: str
    attempt: int
    status: Optional[DispatchLogStatus] = None
    response_status_code: Optional[int] = None
    response_body: Optional[str] = None
    dispatched_at: datetime

    class Config:
        from_attributes = True


class EventLogListResponse(BaseModel):
    """事件日誌列表響應模型"""
    items: List[EventLogResponse]
    total: int
    skip: int
    limit: int


class DispatchLogListResponse(BaseModel):
    """派發日誌列表響應模型"""
    items: List[DispatchLogResponse]
    total: int
    skip: int
    limit: int
