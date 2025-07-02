from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import api_router
from app.stream.broker_manager import broker_manager
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時：創建數據庫表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 啟動 broker（自動處理開發/生產模式）
    await broker_manager.start()

    yield

    # 關閉 broker
    await broker_manager.close()

app = FastAPI(
    title="Webhook Gateway",
    description="A gateway to receive, process, and dispatch webhooks asynchronously.",
    version="0.1.0",
    lifespan=lifespan
)

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# 導入處理器以確保註冊到 FastStream
from app.stream import handlers as handlers

@app.get("/")
def read_root():
    """A simple endpoint to confirm the service is running."""
    return {
        "status": "ok",
        "service": "webhook-gateway",
        "mode": broker_manager.mode_description
    }

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "webhook-gateway"}
