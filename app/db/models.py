import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Enum,
)
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base
from app.core.ids import ulid


class Source(Base):
    __tablename__ = "sources"

    id = Column(String(255), primary_key=True, index=True, default=ulid)
    name = Column(
        String(255), nullable=False
    )  # e.g., "github", "stripe" - 移除 unique 約束和 index
    secret = Column(
        String(255), nullable=False
    )  # Secret key for HMAC signature validation
    signature_validator = Column(
        String(50), nullable=False, default="none"
    )  # Signature validator strategy - 預設為 none
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    topics = relationship("Topic", back_populates="source")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(255), primary_key=True, index=True, default=ulid)
    name = Column(String(255), nullable=False)  # 移除 unique 約束和 index
    source_id = Column(String(255), ForeignKey("sources.id"), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    source = relationship("Source", back_populates="topics")
    subscriptions = relationship("Subscription", back_populates="topic")
    event_logs = relationship("EventLog", back_populates="topic")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(255), primary_key=True, index=True, default=ulid)
    topic_id = Column(String(255), ForeignKey("topics.id"), nullable=False)
    subscriber_name = Column(
        String(255), nullable=False
    )  # Human-readable name for the subscriber service
    target_url = Column(
        String(2048), nullable=False
    )  # URL to which the webhook should be sent
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow
    )

    topic = relationship("Topic", back_populates="subscriptions")
    dispatch_logs = relationship("DispatchLog", back_populates="subscription")


class EventLogStatus(enum.Enum):
    RECEIVED = enum.auto()
    QUEUED = enum.auto()
    FAILED_VALIDATION = enum.auto()
    # TODO: 加上 完成 or 失敗的狀態


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(String(255), primary_key=True, index=True, default=ulid)
    topic_id = Column(String(255), ForeignKey("topics.id"), nullable=False)
    source_ip = Column(String(45))  # IPv6 support
    headers = Column(JSON)
    content_type = Column(String(255))  # Store the original Content-Type header
    payload = Column(Text)  # Store the raw request body as LONGTEXT
    status = Column(Enum(EventLogStatus), default=EventLogStatus.RECEIVED)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)

    topic = relationship("Topic", back_populates="event_logs")
    dispatch_logs = relationship("DispatchLog", back_populates="event_log")


class DispatchLogStatus(enum.Enum):
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(String(255), primary_key=True, index=True, default=ulid)
    event_log_id = Column(String(255), ForeignKey("event_logs.id"), nullable=False)
    subscription_id = Column(String(255), ForeignKey("subscriptions.id"), nullable=False)
    attempt = Column(Integer, default=1)
    status = Column(Enum(DispatchLogStatus))
    response_status_code = Column(Integer)
    response_body = Column(Text)
    dispatched_at = Column(DateTime, default=datetime.datetime.utcnow)

    event_log = relationship("EventLog", back_populates="dispatch_logs")
    subscription = relationship("Subscription", back_populates="dispatch_logs")
