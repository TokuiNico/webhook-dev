from pydantic import BaseModel, ConfigDict, AfterValidator
from datetime import datetime
from typing import Optional
from typing_extensions import Annotated
from app.core.validators import validate_source_name
from app.core.signature.types import SignatureValidatorType


class SourceBase(BaseModel):
    name: Annotated[str, AfterValidator(validate_source_name)]
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
