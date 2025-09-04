from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime


class SubscriptionBase(BaseModel):
    subscriber_name: str
    target_url: HttpUrl
    is_active: bool = True


class SubscriptionCreate(SubscriptionBase):
    topic_id: str  # 改為 str 支援 ULID


class SubscriptionUpdate(BaseModel):
    subscriber_name: Optional[str] = None
    target_url: Optional[HttpUrl] = None
    is_active: Optional[bool] = None


class SubscriptionResponse(SubscriptionBase):
    id: str  # 改為 str 支援 ULID
    topic_id: str  # 改為 str 支援 ULID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubscriptionList(BaseModel):
    items: List[SubscriptionResponse]
    total: int
    skip: int
    limit: int
