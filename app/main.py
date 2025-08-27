from fastapi import FastAPI, Response
from contextlib import asynccontextmanager
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import api_router
from app.stream.broker_manager import broker_manager
import logging

# 新增：安全中介與指標
from app.middleware.security import RateLimitMiddleware, WebhookSecurityMiddleware
from app.monitoring.metrics import get_metrics

# 擴展簽名驗證策略
from app.core.signature import SlackSignatureStrategy, DiscordSignatureStrategy, CustomWebhookStrategy
from app.services.webhook_service import webhook_service

logger = logging.getLogger(__name__)


def register_signature_strategies():
    """註冊擴展的簽名驗證策略"""
    logger.info("🔧 註冊擴展簽名驗證策略...")

    # 註冊新的簽名驗證策略
    webhook_service.signature_validator.register_strategy("slack", SlackSignatureStrategy())
    webhook_service.signature_validator.register_strategy("discord", DiscordSignatureStrategy())
    webhook_service.signature_validator.register_strategy("custom", CustomWebhookStrategy())

    supported_sources = webhook_service.signature_validator.get_supported_sources()
    logger.info(f"✅ 支援的 webhook 來源: {', '.join(supported_sources)}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時：創建數據庫表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 註冊擴展簽名驗證策略
    register_signature_strategies()

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

# 掛載安全中介
app.add_middleware(RateLimitMiddleware)
app.add_middleware(WebhookSecurityMiddleware)

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# 導入處理器以確保註冊到 FastStream
from app.stream import handlers as handlers  # noqa: E402  # isort:skip

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

@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint."""
    return Response(get_metrics(), media_type="text/plain")
