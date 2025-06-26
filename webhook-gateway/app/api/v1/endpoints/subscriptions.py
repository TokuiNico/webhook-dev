from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.db.session import get_async_db
from app.db.models import Subscription, Topic, Source
from app.core.config import settings
from app.schemas.subscription import (
    SubscriptionCreate, 
    SubscriptionResponse, 
    SubscriptionUpdate,
    SubscriptionList
)

router = APIRouter()
security = HTTPBearer()

# API Key authentication
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

@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    subscription: SubscriptionCreate,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Create a new subscription"""
    
    # Verify topic exists
    topic_result = await db.execute(
        select(Topic).where(Topic.id == subscription.topic_id)
    )
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with id {subscription.topic_id} not found"
        )
    
    # Create subscription
    db_subscription = Subscription(
        topic_id=subscription.topic_id,
        subscriber_name=subscription.subscriber_name,
        target_url=str(subscription.target_url),  # Convert HttpUrl to string
        is_active=subscription.is_active
    )
    
    db.add(db_subscription)
    await db.commit()
    await db.refresh(db_subscription)
    
    return SubscriptionResponse.model_validate(db_subscription)

@router.get("/", response_model=SubscriptionList)
async def list_subscriptions(
    topic_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """List subscriptions with optional filtering"""
    
    query = select(Subscription)
    
    # Apply filters
    if topic_id is not None:
        query = query.where(Subscription.topic_id == topic_id)
    if is_active is not None:
        query = query.where(Subscription.is_active == is_active)
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    subscriptions = result.scalars().all()
    
    # Get total count for pagination
    count_query = select(Subscription)
    if topic_id is not None:
        count_query = count_query.where(Subscription.topic_id == topic_id)
    if is_active is not None:
        count_query = count_query.where(Subscription.is_active == is_active)
    
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())
    
    return SubscriptionList(
        items=[SubscriptionResponse.model_validate(sub) for sub in subscriptions],
        total=total,
        skip=skip,
        limit=limit
    )

@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Get a specific subscription by ID"""
    
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with id {subscription_id} not found"
        )
    
    return SubscriptionResponse.model_validate(subscription)

@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: int,
    subscription_update: SubscriptionUpdate,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Update a subscription"""
    
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    db_subscription = result.scalar_one_or_none()
    
    if not db_subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with id {subscription_id} not found"
        )
    
    # Update fields
    update_data = subscription_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        # Convert HttpUrl to string if needed
        if field == "target_url" and hasattr(value, '__str__'):
            value = str(value)
        setattr(db_subscription, field, value)
    
    await db.commit()
    await db.refresh(db_subscription)
    
    return SubscriptionResponse.model_validate(db_subscription)

@router.delete("/{subscription_id}")
async def deactivate_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Deactivate a subscription (soft delete)"""
    
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with id {subscription_id} not found"
        )
    
    subscription.is_active = False
    await db.commit()
    
    return {"message": f"Subscription {subscription_id} deactivated successfully"}

@router.post("/{subscription_id}/activate")
async def activate_subscription(
    subscription_id: int,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Reactivate a subscription"""
    
    result = await db.execute(
        select(Subscription).where(Subscription.id == subscription_id)
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with id {subscription_id} not found"
        )
    
    subscription.is_active = True
    await db.commit()
    
    return {"message": f"Subscription {subscription_id} activated successfully"}
