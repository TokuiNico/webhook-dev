from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from pydantic import BaseModel

from app.db.session import get_async_db
from app.db.models import Topic, Source
from app.core.config import settings

router = APIRouter()
security = HTTPBearer()

# Pydantic models for request/response
class SourceCreate(BaseModel):
    name: str
    secret: str

class SourceResponse(BaseModel):
    id: int
    name: str
    created_at: str
    
    class Config:
        from_attributes = True

class TopicCreate(BaseModel):
    name: str
    source_id: int
    description: str = ""

class TopicResponse(BaseModel):
    id: int
    name: str
    source_id: int
    description: str
    created_at: str
    
    class Config:
        from_attributes = True

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

# Source endpoints
@router.get("/sources/", response_model=List[SourceResponse])
async def list_sources(
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """List all webhook sources"""
    result = await db.execute(select(Source).order_by(Source.name))
    sources = result.scalars().all()
    
    return [
        SourceResponse(
            id=source.id,
            name=source.name,
            created_at=source.created_at.isoformat()
        )
        for source in sources
    ]

@router.post("/sources/", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def create_source(
    source: SourceCreate,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Create a new webhook source"""
    
    # Check if source already exists
    existing_result = await db.execute(
        select(Source).where(Source.name == source.name)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source with name '{source.name}' already exists"
        )
    
    # Create new source
    db_source = Source(
        name=source.name,
        secret=source.secret
    )
    
    db.add(db_source)
    await db.commit()
    await db.refresh(db_source)
    
    return SourceResponse(
        id=db_source.id,
        name=db_source.name,
        created_at=db_source.created_at.isoformat()
    )

# Topic endpoints
@router.get("/topics/", response_model=List[TopicResponse])
async def list_topics(
    source_id: int = None,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """List all topics, optionally filtered by source"""
    query = select(Topic)
    
    if source_id:
        query = query.where(Topic.source_id == source_id)
    
    query = query.order_by(Topic.name)
    result = await db.execute(query)
    topics = result.scalars().all()
    
    return [
        TopicResponse(
            id=topic.id,
            name=topic.name,
            source_id=topic.source_id,
            description=topic.description or "",
            created_at=topic.created_at.isoformat()
        )
        for topic in topics
    ]

@router.post("/topics/", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic: TopicCreate,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Create a new topic"""
    
    # Verify source exists
    source_result = await db.execute(
        select(Source).where(Source.id == topic.source_id)
    )
    if not source_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source with id {topic.source_id} not found"
        )
    
    # Check if topic already exists
    existing_result = await db.execute(
        select(Topic).where(Topic.name == topic.name)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Topic with name '{topic.name}' already exists"
        )
    
    # Create new topic
    db_topic = Topic(
        name=topic.name,
        source_id=topic.source_id,
        description=topic.description
    )
    
    db.add(db_topic)
    await db.commit()
    await db.refresh(db_topic)
    
    return TopicResponse(
        id=db_topic.id,
        name=db_topic.name,
        source_id=db_topic.source_id,
        description=db_topic.description or "",
        created_at=db_topic.created_at.isoformat()
    )

@router.get("/topics/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: int,
    db: AsyncSession = Depends(get_async_db),
    api_key: str = Depends(get_api_key)
):
    """Get a specific topic by ID"""
    
    result = await db.execute(
        select(Topic).where(Topic.id == topic_id)
    )
    topic = result.scalar_one_or_none()
    
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with id {topic_id} not found"
        )
    
    return TopicResponse(
        id=topic.id,
        name=topic.name,
        source_id=topic.source_id,
        description=topic.description or "",
        created_at=topic.created_at.isoformat()
    ) 