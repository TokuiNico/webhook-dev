from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Async engine and session for FastAPI
engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Sync engine and session for Celery workers
sync_database_url = settings.DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://")
sync_engine = create_engine(sync_database_url, echo=True)
SessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)

async def get_async_db():
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
