from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None


class TopicCreate(TopicBase):
    source_id: int


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TopicResponse(TopicBase):
    id: int
    name: str
    source_id: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SourceBase(BaseModel):
    name: str
    secret: str


class SourceCreate(SourceBase):
    pass


class SourceResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
