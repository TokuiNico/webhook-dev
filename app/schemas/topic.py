from typing_extensions import Annotated
from pydantic import BaseModel, ConfigDict, field_validator, AfterValidator
from typing import Optional
from datetime import datetime

from app.core.validators import validate_topic_name


class TopicBase(BaseModel):
    name: Annotated[str, AfterValidator(validate_topic_name)]
    description: Optional[str] = None


class TopicCreate(TopicBase):
    source_id: int


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            error = validate_topic_name(v)
            if error:
                raise ValueError(error)
        return v


class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    source_id: int
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
