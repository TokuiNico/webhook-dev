from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import api_router
from app.stream.app import broker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時：創建數據庫表和啟動 FastStream
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await broker.start()
    
    yield
    
    # 關閉時：關閉 FastStream
    await broker.close()

app = FastAPI(
    title="Webhook Gateway",
    description="A gateway to receive, process, and dispatch webhooks asynchronously.",
    version="0.1.0",
    lifespan=lifespan
)

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# 導入處理器以確保註冊到 FastStream
from app.stream import handlers

@app.get("/")
def read_root():
    """A simple endpoint to confirm the service is running."""
    return {"status": "ok", "service": "webhook-gateway"}

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "webhook-gateway"}
