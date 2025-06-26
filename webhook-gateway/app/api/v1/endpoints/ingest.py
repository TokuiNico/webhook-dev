from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import Source, Topic, EventLog, EventLogStatus
from app.core.security import get_webhook_body_and_signature, verify_webhook_signature
from app.worker.tasks import dispatch_webhooks
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/ingest/{source_name}/{topic_name}")
async def receive_webhook(
    source_name: str,
    topic_name: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive and process incoming webhooks.
    
    Args:
        source_name: Name of the webhook source (e.g., 'github', 'stripe')
        topic_name: Name of the topic (e.g., 'push', 'payment.succeeded')
        request: FastAPI request object
        db: Database session
    
    Returns:
        JSONResponse: Acceptance confirmation
    """
    try:
        # Get request body and signature headers
        body, signature_headers = await get_webhook_body_and_signature(request)
        
        # Get source from database
        source_query = select(Source).where(Source.name == source_name)
        source_result = await db.execute(source_query)
        source = source_result.scalar_one_or_none()
        
        if not source:
            logger.warning(f"Unknown source: {source_name}")
            raise HTTPException(status_code=404, detail="Source not found")
        
        # Get topic from database
        topic_query = select(Topic).where(
            Topic.name == topic_name,
            Topic.source_id == source.id
        )
        topic_result = await db.execute(topic_query)
        topic = topic_result.scalar_one_or_none()
        
        if not topic:
            logger.warning(f"Unknown topic: {topic_name} for source: {source_name}")
            raise HTTPException(status_code=404, detail="Topic not found")
        
        # Verify signature based on source type
        signature_valid = False
        used_signature = None
        
        if source_name.lower() == "github" and signature_headers["github"]:
            signature_valid = verify_webhook_signature(
                body, signature_headers["github"], source.secret, "sha256"
            )
            used_signature = signature_headers["github"]
        elif source_name.lower() == "stripe" and signature_headers["stripe"]:
            # For Stripe, we need special handling
            from app.core.security import verify_stripe_signature
            signature_valid = verify_stripe_signature(
                body, signature_headers["stripe"], source.secret
            )
            used_signature = signature_headers["stripe"]
        elif signature_headers["generic"]:
            signature_valid = verify_webhook_signature(
                body, signature_headers["generic"], source.secret, "sha256"
            )
            used_signature = signature_headers["generic"]
        else:
            logger.warning(f"No signature found for source: {source_name}")
            # For development, we might want to allow unsigned webhooks
            # In production, this should be False
            signature_valid = False
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Get content type
        content_type = request.headers.get("content-type", "application/octet-stream")
        
        # Create event log
        event_log = EventLog(
            topic_id=topic.id,
            source_ip=client_ip,
            headers=dict(request.headers),
            content_type=content_type,
            payload=body.decode('utf-8') if body else "",
            status=EventLogStatus.RECEIVED if signature_valid else EventLogStatus.FAILED_VALIDATION
        )
        
        db.add(event_log)
        await db.commit()
        await db.refresh(event_log)
        
        if signature_valid:
            logger.info(f"Valid webhook received for topic {topic_name} from {source_name}")
            
            # Update status to queued
            event_log.status = EventLogStatus.QUEUED
            await db.commit()
            
            # Dispatch to Celery for processing
            dispatch_webhooks.delay(event_log.id)
            
            return JSONResponse(
                status_code=202,
                content={"message": "Webhook received and queued for processing"}
            )
        else:
            logger.warning(f"Invalid signature for webhook from {source_name}")
            raise HTTPException(
                status_code=403,
                detail="Invalid webhook signature"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error processing webhook"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "webhook-gateway"}
