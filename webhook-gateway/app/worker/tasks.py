import httpx
from celery import current_task
from celery.exceptions import Retry
from sqlalchemy.orm import Session
from app.worker.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.db import models
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def dispatch_webhooks(self, event_log_id: int):
    """
    Main task to dispatch webhooks to all subscribers of a topic.
    
    Args:
        event_log_id: ID of the event log to dispatch
    """
    try:
        # Note: We'll need to adapt this for async SQLAlchemy
        # For now, this is a placeholder structure
        logger.info(f"Starting dispatch for event_log_id: {event_log_id}")
        
        # TODO: Implement actual database queries
        # 1. Get event log from database
        # 2. Get all active subscriptions for the topic
        # 3. For each subscription, create a send_to_subscriber task
        
        # Placeholder for now
        logger.info(f"Dispatching event {event_log_id} to subscribers")
        
        return f"Dispatched event {event_log_id}"
        
    except Exception as exc:
        logger.error(f"Error dispatching webhooks for event {event_log_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))

@celery_app.task(bind=True, max_retries=5)
def send_to_subscriber(self, subscription_id: int, event_log_data: Dict[str, Any]):
    """
    Sub-task to send webhook to a specific subscriber.
    
    Args:
        subscription_id: ID of the subscription
        event_log_data: Event data to send (content_type, payload, headers)
    """
    try:
        logger.info(f"Sending webhook to subscription {subscription_id}")
        
        # TODO: Implement actual HTTP request
        # 1. Get subscription details from database
        # 2. Prepare HTTP request with original content-type and payload
        # 3. Send request using httpx
        # 4. Log the result to dispatch_logs table
        
        # Placeholder HTTP request
        target_url = event_log_data.get("target_url", "http://example.com")
        content_type = event_log_data.get("content_type", "application/json")
        payload = event_log_data.get("payload", "{}")
        
        with httpx.Client(timeout=30) as client:
            response = client.post(
                target_url,
                content=payload,
                headers={"Content-Type": content_type}
            )
            
            logger.info(f"Webhook sent to {target_url}, status: {response.status_code}")
            
            # TODO: Log to dispatch_logs table
            
            return {
                "subscription_id": subscription_id,
                "status_code": response.status_code,
                "success": response.status_code < 400
            }
            
    except httpx.RequestError as exc:
        logger.error(f"Network error sending webhook to subscription {subscription_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
    except Exception as exc:
        logger.error(f"Error sending webhook to subscription {subscription_id}: {exc}")
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
