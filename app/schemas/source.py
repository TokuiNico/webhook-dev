from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SourceBase(BaseModel):
    name: str
    secret: str

class SourceCreate(SourceBase):
    pass

class SourceResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
