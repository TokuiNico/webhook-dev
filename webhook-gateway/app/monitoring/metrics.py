from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from typing import Dict, Any
import time
import logging

logger = logging.getLogger(__name__)

# 創建自定義registry
registry = CollectorRegistry()

# Webhook 相關指標
webhook_requests_total = Counter(
    'webhook_requests_total',
    'Total webhook requests received',
    ['source', 'topic', 'status'],
    registry=registry
)

webhook_request_duration = Histogram(
    'webhook_request_duration_seconds',
    'Time spent processing webhook requests',
    ['source', 'topic'],
    registry=registry
)

webhook_dispatch_total = Counter(
    'webhook_dispatch_total',
    'Total webhook dispatches attempted',
    ['source', 'topic', 'status'],
    registry=registry
)

webhook_dispatch_duration = Histogram(
    'webhook_dispatch_duration_seconds',
    'Time spent dispatching webhooks',
    ['source', 'topic'],
    registry=registry
)

# 系統指標
active_subscriptions = Gauge(
    'active_subscriptions_total',
    'Number of active subscriptions',
    registry=registry
)

queue_size = Gauge(
    'webhook_queue_size',
    'Current size of webhook processing queue',
    ['queue_name'],
    registry=registry
)

# 錯誤指標
webhook_errors_total = Counter(
    'webhook_errors_total',
    'Total webhook processing errors',
    ['error_type', 'source', 'topic'],
    registry=registry
)

class MetricsCollector:
    """指標收集器"""
    
    @staticmethod
    def record_webhook_request(source: str, topic: str, status: str, duration: float | None = None):
        """記錄 webhook 請求指標"""
        webhook_requests_total.labels(source=source, topic=topic, status=status).inc()
        if duration is not None:
            webhook_request_duration.labels(source=source, topic=topic).observe(duration)
    
    @staticmethod
    def record_webhook_dispatch(source: str, topic: str, status: str, duration: float | None = None):
        """記錄 webhook 分發指標"""
        webhook_dispatch_total.labels(source=source, topic=topic, status=status).inc()
        if duration is not None:
            webhook_dispatch_duration.labels(source=source, topic=topic).observe(duration)
    
    @staticmethod
    def record_error(error_type: str, source: str = "unknown", topic: str = "unknown"):
        """記錄錯誤指標"""
        webhook_errors_total.labels(error_type=error_type, source=source, topic=topic).inc()
    
    @staticmethod
    def update_active_subscriptions(count: int):
        """更新活躍訂閱數"""
        active_subscriptions.set(count)
    
    @staticmethod
    def update_queue_size(queue_name: str, size: int):
        """更新隊列大小"""
        queue_size.labels(queue_name=queue_name).set(size)

def get_metrics() -> str:
    """獲取 Prometheus 格式的指標"""
    return generate_latest(registry).decode('utf-8')

# 裝飾器用於自動計時
def track_time(metric_func):
    """裝飾器：自動追蹤執行時間"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                # 這裡需要根據具體情況調用 metric_func
                return result
            except Exception as e:
                duration = time.time() - start_time
                logger.error(f"Function {func.__name__} failed after {duration:.2f}s: {e}")
                raise
        return wrapper
    return decorator 