from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict


class SourceBase(BaseModel):
    name: str  # 移除 NameType 限制，允許任意名稱
    secret: str
    signature_validator: Literal["github", "none"] = "none"  # 只支援 github 和 none


class SourceCreate(SourceBase):
    pass


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str  # 改為 str 支援 ULID
    name: str
    signature_validator: str
    created_at: datetime
    updated_at: Optional[datetime] = None
