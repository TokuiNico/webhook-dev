"""
測試配置和共用 fixture
"""

import asyncio
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import AsyncGenerator

from app.main import app
from app.db.base import Base


# 測試資料庫設定
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_webhook.db"

# 創建測試引擎
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """創建事件循環供異步測試使用"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """創建測試資料庫會話"""
    # 創建測試資料庫表（只在會話開始時執行一次）
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 創建會話並關閉自動提交
    session = TestSessionLocal()

    try:
        yield session
        await session.commit()  # 提交測試中的變更
    finally:
        await session.close()


@pytest.fixture
def client() -> TestClient:
    """創建測試 HTTP 客戶端"""
    from app.db.session import get_async_db
    from app.api.v1.deps import get_authenticated_db

    # 覆蓋數據庫依賴項以使用測試數據庫
    async def override_get_async_db():
        async with TestSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()

    app.dependency_overrides[get_async_db] = override_get_async_db
    app.dependency_overrides[get_authenticated_db] = override_get_async_db

    return TestClient(app)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def cleanup_test_db():
    """測試會話結束後清理測試數據庫"""
    yield
    # 清理測試資料庫表
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def test_api_key() -> str:
    """測試用的 API 金鑰"""
    return "hello"


@pytest.fixture
def test_headers(test_api_key: str) -> dict:
    """測試用的請求標頭"""
    return {"Authorization": f"Bearer {test_api_key}"}
