from pydantic import BaseModel, HttpUrl

class SubscriptionBase(BaseModel):
    callback_url: HttpUrl
    is_active: bool = True

class SubscriptionCreate(SubscriptionBase):
    topic_id: int

class SubscriptionRead(SubscriptionBase):
    id: int
    topic_id: int

    class Config:
        orm_mode = True
