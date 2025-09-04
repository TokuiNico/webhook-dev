from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.core.signature.types import SignatureValidatorType
from app.core.validators import NameType


class SourceBase(BaseModel):
    name: NameType
    secret: str
    signature_validator: SignatureValidatorType = SignatureValidatorType.GENERIC


class SourceCreate(SourceBase):
    pass


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    signature_validator: SignatureValidatorType
    created_at: datetime
    updated_at: Optional[datetime] = None
