from pydantic import BaseModel

class TopicBase(BaseModel):
    name: str
    description: str | None = None

class TopicCreate(TopicBase):
    pass

class TopicRead(TopicBase):
    id: int

    class Config:
        orm_mode = True
