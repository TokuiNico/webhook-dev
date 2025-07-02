from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.db.session import get_async_db
from app.db.models import EventLog, DispatchLog, Subscription, Topic, Source
from app.core.config import settings

router = APIRouter()
security = HTTPBearer()

# API Key authentication (reuse from subscriptions)
def get_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API key for management endpoints"""
    expected_key = settings.MANAGEMENT_API_KEY
    if not expected_key or expected_key == "your-management-api-key":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Management API key not configured"
        )
    
    if credentials.credentials != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return credentials.credentials

@router.get("/overview")
async def get_overview_stats(
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
) -> Dict[str, Any]:
    """Get overview statistics for dashboard"""
    
    # Calculate date ranges
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Total webhooks received
    total_webhooks_result = await db.execute(
        select(func.count(EventLog.id))
    )
    total_webhooks = total_webhooks_result.scalar() or 0
    
    # Webhooks today
    today_webhooks_result = await db.execute(
        select(func.count(EventLog.id)).where(
            EventLog.received_at >= today_start
        )
    )
    today_webhooks = today_webhooks_result.scalar() or 0
    
    # Webhooks this week
    week_webhooks_result = await db.execute(
        select(func.count(EventLog.id)).where(
            EventLog.received_at >= week_start
        )
    )
    week_webhooks = week_webhooks_result.scalar() or 0
    
    # Active subscriptions
    active_subscriptions_result = await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.is_active == True
        )
    )
    active_subscriptions = active_subscriptions_result.scalar() or 0
    
    # Total subscriptions
    total_subscriptions_result = await db.execute(
        select(func.count(Subscription.id))
    )
    total_subscriptions = total_subscriptions_result.scalar() or 0
    
    # Success rate (last 24 hours)
    successful_dispatches_result = await db.execute(
        select(func.count(DispatchLog.id)).where(
            and_(
                DispatchLog.dispatched_at >= today_start,
                DispatchLog.status == "success"
            )
        )
    )
    successful_dispatches = successful_dispatches_result.scalar() or 0
    
    total_dispatches_result = await db.execute(
        select(func.count(DispatchLog.id)).where(
            DispatchLog.dispatched_at >= today_start
        )
    )
    total_dispatches = total_dispatches_result.scalar() or 0
    
    success_rate = (successful_dispatches / total_dispatches * 100) if total_dispatches > 0 else 0
    
    # Recent events (last 10)
    recent_events_result = await db.execute(
        select(EventLog, Topic, Source)
        .join(Topic, EventLog.topic_id == Topic.id)
        .join(Source, Topic.source_id == Source.id)
        .order_by(EventLog.received_at.desc())
        .limit(10)
    )
    recent_events = [
        {
            "id": event.id,
            "source": source.name,
            "topic": topic.name,
            "status": event.status.value,
            "received_at": event.received_at.isoformat(),
            "content_type": event.content_type
        }
        for event, topic, source in recent_events_result.all()
    ]
    
    return {
        "total_webhooks": total_webhooks,
        "today_webhooks": today_webhooks,
        "week_webhooks": week_webhooks,
        "month_webhooks": 0,  # Calculate if needed
        "active_subscriptions": active_subscriptions,
        "total_subscriptions": total_subscriptions,
        "success_rate": round(success_rate, 2),
        "recent_events": recent_events,
        "system_status": "healthy"  # Could be dynamic based on checks
    }

@router.get("/activity")
async def get_activity_stats(
    days: int = 7,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
) -> Dict[str, Any]:
    """Get activity statistics over time"""
    
    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get daily webhook counts
    daily_counts_result = await db.execute(
        select(
            func.date(EventLog.received_at).label('date'),
            func.count(EventLog.id).label('count')
        )
        .where(EventLog.received_at >= start_date)
        .group_by(func.date(EventLog.received_at))
        .order_by(func.date(EventLog.received_at))
    )
    
    daily_activity = [
        {
            "date": str(row.date),
            "webhooks": row.count
        }
        for row in daily_counts_result.all()
    ]
    
    # Get hourly counts for today
    today_start = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
    hourly_counts_result = await db.execute(
        select(
            func.extract('hour', EventLog.received_at).label('hour'),
            func.count(EventLog.id).label('count')
        )
        .where(EventLog.received_at >= today_start)
        .group_by(func.extract('hour', EventLog.received_at))
        .order_by(func.extract('hour', EventLog.received_at))
    )
    
    hourly_activity = [
        {
            "hour": int(row.hour),
            "webhooks": row.count
        }
        for row in hourly_counts_result.all()
    ]
    
    return {
        "daily_activity": daily_activity,
        "hourly_activity": hourly_activity,
        "period_days": days
    }

@router.get("/sources")
async def get_source_stats(
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
) -> Dict[str, Any]:
    """Get statistics by source"""
    
    # Get webhook counts by source
    source_stats_result = await db.execute(
        select(
            Source.name.label('source_name'),
            func.count(EventLog.id).label('webhook_count'),
            func.count(Topic.id).label('topic_count')
        )
        .select_from(Source)
        .outerjoin(Topic, Source.id == Topic.source_id)
        .outerjoin(EventLog, Topic.id == EventLog.topic_id)
        .group_by(Source.id, Source.name)
        .order_by(func.count(EventLog.id).desc())
    )
    
    source_stats = [
        {
            "source": row.source_name,
            "webhook_count": row.webhook_count or 0,
            "topic_count": row.topic_count or 0
        }
        for row in source_stats_result.all()
    ]
    
    # Get top topics
    top_topics_result = await db.execute(
        select(
            Topic.name.label('topic_name'),
            Source.name.label('source_name'),
            func.count(EventLog.id).label('webhook_count')
        )
        .select_from(Topic)
        .join(Source, Topic.source_id == Source.id)
        .outerjoin(EventLog, Topic.id == EventLog.topic_id)
        .group_by(Topic.id, Topic.name, Source.name)
        .order_by(func.count(EventLog.id).desc())
        .limit(10)
    )
    
    top_topics = [
        {
            "topic": row.topic_name,
            "source": row.source_name,
            "webhook_count": row.webhook_count or 0
        }
        for row in top_topics_result.all()
    ]
    
    return {
        "source_stats": source_stats,
        "top_topics": top_topics
    } 