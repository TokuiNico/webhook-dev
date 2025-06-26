import httpx
import asyncio
from celery import current_task
from celery.exceptions import Retry
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.worker.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.db.models import EventLog, Subscription, Topic, DispatchLog
from typing import Dict, Any, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def dispatch_webhooks(self, event_log_id: int):
    """
    Main task to dispatch webhooks to all subscribers of a topic.
    
    Args:
        event_log_id: ID of the event log to dispatch
    """
    try:
        logger.info(f"Starting dispatch for event_log_id: {event_log_id}")
        
        # Run async function in sync context
        result = asyncio.run(_dispatch_webhooks_async(event_log_id))
        
        logger.info(f"Dispatched event {event_log_id} to {result['subscription_count']} subscribers")
        return result
        
    except Exception as exc:
        logger.error(f"Error dispatching webhooks for event {event_log_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))

async def _dispatch_webhooks_async(event_log_id: int) -> Dict[str, Any]:
    """
    Async helper function to handle database operations.
    """
    session = AsyncSessionLocal()
    try:
        # 1. Get event log from database
        event_result = await session.execute(
            select(EventLog).where(EventLog.id == event_log_id)
        )
        event_log = event_result.scalar_one_or_none()
        
        if not event_log:
            raise ValueError(f"Event log {event_log_id} not found")
        
        # 2. Get all active subscriptions for the topic
        subscriptions_result = await session.execute(
            select(Subscription).where(
                Subscription.topic_id == event_log.topic_id,
                Subscription.is_active == True
            )
        )
        subscriptions = subscriptions_result.scalars().all()
        
        logger.info(f"Found {len(subscriptions)} active subscriptions for topic {event_log.topic_id}")
        
        # 3. For each subscription, create a send_to_subscriber task
        dispatched_count = 0
        for subscription in subscriptions:
            # Prepare event data for the task
            event_data = {
                "event_log_id": event_log.id,
                "content_type": event_log.content_type,
                "payload": event_log.payload,
                "headers": event_log.headers,
                "target_url": subscription.target_url
            }
            
            # Launch async task
            send_to_subscriber.delay(subscription.id, event_data)
            dispatched_count += 1
            
            logger.info(f"Queued dispatch to subscription {subscription.id} ({subscription.subscriber_name})")
        
        return {
            "event_log_id": event_log_id,
            "subscription_count": dispatched_count,
            "status": "dispatched"
        }
        
    finally:
        await session.close()

@celery_app.task(bind=True, max_retries=5)
def send_to_subscriber(self, subscription_id: int, event_log_data: Dict[str, Any]):
    """
    Sub-task to send webhook to a specific subscriber.
    
    Args:
        subscription_id: ID of the subscription
        event_log_data: Event data to send (content_type, payload, headers, target_url)
    """
    try:
        logger.info(f"Sending webhook to subscription {subscription_id}")
        
        # Run async function in sync context
        result = asyncio.run(_send_to_subscriber_async(subscription_id, event_log_data, self.request.retries))
        
        logger.info(f"Webhook sent to subscription {subscription_id}, status: {result['status_code']}")
        return result
        
    except httpx.RequestError as exc:
        logger.error(f"Network error sending webhook to subscription {subscription_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
    except Exception as exc:
        logger.error(f"Error sending webhook to subscription {subscription_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))

async def _send_to_subscriber_async(subscription_id: int, event_log_data: Dict[str, Any], retry_count: int) -> Dict[str, Any]:
    """
    Async helper function to send webhook and log the result.
    """
    session = AsyncSessionLocal()
    
    try:
        # Extract data
        target_url = event_log_data["target_url"]
        content_type = event_log_data.get("content_type", "application/json")
        payload = event_log_data.get("payload", "")
        event_log_id = event_log_data["event_log_id"]
        
        # Prepare headers
        headers = {"Content-Type": content_type}
        
        # Add original headers if needed (excluding sensitive ones)
        original_headers = event_log_data.get("headers", {})
        if isinstance(original_headers, dict):
            # Forward some useful headers but exclude sensitive ones
            forward_headers = ["User-Agent", "X-Forwarded-For", "X-Request-ID"]
            for header in forward_headers:
                if header.lower() in original_headers:
                    headers[header] = original_headers[header.lower()]
        
        # Send HTTP request
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                target_url,
                content=payload,
                headers=headers
            )
            
            status_code = response.status_code
            response_body = response.text[:1000]  # Limit response body size
            success = status_code < 400
            
            # Log to dispatch_logs table
            dispatch_log = DispatchLog(
                event_log_id=event_log_id,
                subscription_id=subscription_id,
                attempt=retry_count + 1,
                status="success" if success else "failed",
                response_status_code=status_code,
                response_body=response_body,
                dispatched_at=datetime.utcnow()
            )
            
            session.add(dispatch_log)
            await session.commit()
            
            return {
                "subscription_id": subscription_id,
                "target_url": target_url,
                "status_code": status_code,
                "success": success,
                "attempt": retry_count + 1
            }
            
    except httpx.RequestError as exc:
        # Log failed network request
        dispatch_log = DispatchLog(
            event_log_id=event_log_data["event_log_id"],
            subscription_id=subscription_id,
            attempt=retry_count + 1,
            status="failed",
            response_status_code=0,
            response_body=f"Network error: {str(exc)}",
            dispatched_at=datetime.utcnow()
        )
        
        session.add(dispatch_log)
        await session.commit()
        raise
        
    finally:
        await session.close()
