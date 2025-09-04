from datetime import datetime
from typing import Optional, Literal, Dict, Any

from pydantic import BaseModel, ConfigDict


class SourceBase(BaseModel):
    name: str  # 移除 NameType 限制，允許任意名稱
    secret: str
    auth_type: Literal["signature", "none"] = "none"  # 認證類型
    auth_config: Optional[Dict[str, Any]] = None  # 認證配置 (JSON)


class SourceCreate(SourceBase):
    pass


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str  # 改為 str 支援 ULID
    name: str
    auth_type: str
    auth_config: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
