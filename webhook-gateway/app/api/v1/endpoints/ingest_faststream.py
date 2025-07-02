from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import Source, Topic, EventLog, EventLogStatus, Subscription
from app.core.security import get_webhook_body_and_signature, verify_webhook_signature, verify_stripe_signature
from app.stream.broker_manager import broker_manager
from app.stream.models import WebhookEvent, SubscriptionInfo
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/{source_name}/{topic_name}")
async def receive_webhook(
    source_name: str,
    topic_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    接收來自外部服務的 webhook
    支持多種內容格式：JSON, XML, Form-data
    自動處理開發/生產模式的消息分發
    """
    # 獲取客戶端 IP 和請求數據
    client_ip = request.client.host if request.client else "unknown"
    body, signature_headers = await get_webhook_body_and_signature(request)
    content_type = request.headers.get("content-type", "application/octet-stream")

    logger.info(f"📨 收到 webhook - 來源: {source_name}, 主題: {topic_name}, 類型: {content_type}")

    # 驗證 source 和 topic
    source_result = await db.execute(select(Source).where(Source.name == source_name))
    source = source_result.scalar_one_or_none()
    if not source:
        logger.warning(f"❌ 未知來源: {source_name}")
        raise HTTPException(status_code=404, detail=f"Source '{source_name}' not found")

    topic_result = await db.execute(
        select(Topic).where(Topic.name == topic_name, Topic.source_id == source.id)
    )
    topic = topic_result.scalar_one_or_none()
    if not topic:
        logger.warning(f"❌ 未知主題: {topic_name} for source {source_name}")
        raise HTTPException(status_code=404, detail=f"Topic '{topic_name}' not found for source '{source_name}'")

    # 記錄事件到數據庫
    event_log = EventLog(
        topic_id=topic.id,
        content_type=content_type,
        payload=body.decode('utf-8') if body else "",
        headers=json.dumps(dict(request.headers)),
        source_ip=client_ip,
        status=EventLogStatus.RECEIVED
    )
    db.add(event_log)
    await db.commit()
    await db.refresh(event_log)

    # 驗證簽名
    signature_valid = False
    if source_name.lower() == "stripe" and signature_headers.get("stripe"):
        signature_valid = verify_stripe_signature(body, signature_headers["stripe"], source.secret)
    elif source_name.lower() == "github" and signature_headers.get("github"):
        signature_valid = verify_webhook_signature(body, signature_headers["github"], source.secret)
    elif signature_headers.get("generic"):
        signature_valid = verify_webhook_signature(body, signature_headers["generic"], source.secret)
    else:
        logger.warning(f"⚠️ 無有效簽名頭 for source {source_name}")
        signature_valid = False

    if not signature_valid:
        logger.warning(f"❌ 簽名驗證失敗: {source_name}")
        event_log.status = EventLogStatus.FAILED_VALIDATION
        await db.commit()
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    # 簽名驗證成功，處理事件
    logger.info(f"✅ 簽名驗證成功: {source_name}/{topic_name}")
    event_log.status = EventLogStatus.QUEUED
    await db.commit()

    # 獲取所有活躍訂閱
    subscriptions_result = await db.execute(
        select(Subscription).where(
            Subscription.topic_id == topic.id,
            Subscription.is_active == True
        )
    )
    subscriptions = subscriptions_result.scalars().all()

    # 創建 webhook 事件
    webhook_event = WebhookEvent(
        event_log_id=event_log.id,
        topic_id=topic.id,
        topic_name=topic.name,
        source_name=source.name,
        payload=body.decode('utf-8') if body else "",
        content_type=content_type,
        headers=dict(request.headers),
        source_ip=client_ip,
        subscriptions=[
            SubscriptionInfo(
                id=sub.id,
                subscriber_name=sub.subscriber_name,
                target_url=sub.target_url,
                is_active=sub.is_active
            ) for sub in subscriptions
        ],
        received_at=event_log.received_at
    )

    # 使用統一的 broker 管理器發布事件（自動處理開發/生產模式）
    await broker_manager.publish(webhook_event, "webhook.received")

    logger.info(f"🚀 事件已發送處理: {event_log.id} ({broker_manager.mode_description})")
    return JSONResponse(
        status_code=202,
        content={"message": "Webhook received and queued for processing"}
    )

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "webhook-gateway"}
