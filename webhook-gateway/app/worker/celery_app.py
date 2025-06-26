from celery import Celery
from app.core.config import settings
from app.core.redis_client import get_redis_url

# Create Celery app instance
celery_app = Celery(
    "webhook_worker",
    broker=get_redis_url(),
    backend=get_redis_url(),
    include=["app.worker.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.worker.tasks.dispatch_webhooks": {"queue": "webhook_dispatch"},
        "app.worker.tasks.send_to_subscriber": {"queue": "webhook_send"},
    },
    task_default_queue="default",
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    # Connection settings
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    # Development settings - enable eager mode for testing
    task_always_eager=settings.DEVELOPMENT and settings.USE_FAKE_REDIS,
    task_eager_propagates=True,  # 讓異常在 eager mode 中正確傳播
)
