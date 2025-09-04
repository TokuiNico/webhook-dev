from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

from app.core.validators import NameType


class TopicBase(BaseModel):
    name: NameType
    description: Optional[str] = None


class TopicCreate(TopicBase):
    source_id: int


class TopicUpdate(BaseModel):
    name: NameType | None = None
    description: Optional[str] = None


class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    source_id: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
