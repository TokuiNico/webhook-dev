from datetime import datetime
from typing import Optional, Literal, Dict, Any

from pydantic import BaseModel, ConfigDict, model_validator


class SourceBase(BaseModel):
    name: str
    secret: Optional[str] = None  # Secret key (required when auth_type is "signature", optional when "none")
    auth_type: Literal["signature", "none"] = "none"  # 認證類型
    auth_config: Optional[Dict[str, Any]] = None  # 認證配置 (JSON)

    @model_validator(mode='after')
    def validate_secret_for_signature(self):
        """驗證當 auth_type 為 signature 時，secret 必須提供"""
        if self.auth_type == "signature" and not self.secret:
            raise ValueError("當認證類型為 'signature' 時，secret 為必填項目")
        return self


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    secret: Optional[str] = None
    auth_type: Optional[Literal["signature", "none"]] = None
    auth_config: Optional[Dict[str, Any]] = None


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str  # 改為 str 支援 ULID
    name: str
    auth_type: str
    auth_config: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
