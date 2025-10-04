from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None


class TopicCreate(TopicBase):
    source_id: str  # 改為 str 支援 ULID


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    source_id: Optional[str] = None


class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: str  # 改為 str 支援 ULID
    name: str
    source_id: str  # 改為 str 支援 ULID
    description: Optional[str] = None
    ingest_url: str  # 新增 ingest_url 欄位
    created_at: datetime
    updated_at: datetime
