from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import api_router
from app.taskiq.broker_manager import taskiq_broker_manager
from app.core.error_handler import create_exception_handlers
import logging

# 新增：安全中介與指標
from app.middleware.security import RateLimitMiddleware, WebhookSecurityMiddleware
from app.monitoring.metrics import get_metrics

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時：創建數據庫表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 啟動 TaskIQ broker（自動處理開發/生產模式）
    await taskiq_broker_manager.startup()

    yield

    # 關閉 TaskIQ broker
    await taskiq_broker_manager.shutdown()


app = FastAPI(
    title="Webhook Gateway",
    description="A gateway to receive, process, and dispatch webhooks asynchronously.",
    version="0.1.0",
    lifespan=lifespan,
)

# 添加 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 前端開發端口
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加異常處理器
exception_handlers = create_exception_handlers()
for exc_type, handler in exception_handlers.items():
    app.add_exception_handler(exc_type, handler)

# 掛載安全中介
app.add_middleware(RateLimitMiddleware)
app.add_middleware(WebhookSecurityMiddleware)

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# 導入 TaskIQ 任務以確保註冊


@app.get("/")
def read_root():
    """A simple endpoint to confirm the service is running."""
    return {
        "status": "ok",
        "service": "webhook-gateway",
        "mode": taskiq_broker_manager.mode_description,
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "webhook-gateway"}


@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint."""
    return Response(get_metrics(), media_type="text/plain")
