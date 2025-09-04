import time
import hashlib
from collections import defaultdict
from typing import Dict
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, app, requests_per_minute: int = 60, requests_per_second: int = 10
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        self.minute_tracker: Dict[str, list] = defaultdict(list)
        self.second_tracker: Dict[str, list] = defaultdict(list)

    def get_client_id(self, request: Request) -> str:
        """獲取客戶端標識（IP + User-Agent 的組合）"""
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "")
        return hashlib.md5(f"{client_ip}:{user_agent}".encode()).hexdigest()

    def is_rate_limited(self, client_id: str) -> bool:
        """檢查是否觸發速率限制"""
        now = time.time()

        # 清理舊記錄
        self.minute_tracker[client_id] = [
            req_time
            for req_time in self.minute_tracker[client_id]
            if now - req_time < 60
        ]
        self.second_tracker[client_id] = [
            req_time
            for req_time in self.second_tracker[client_id]
            if now - req_time < 1
        ]

        # 檢查限制
        if len(self.minute_tracker[client_id]) >= self.requests_per_minute:
            return True
        if len(self.second_tracker[client_id]) >= self.requests_per_second:
            return True

        # 記錄請求
        self.minute_tracker[client_id].append(now)
        self.second_tracker[client_id].append(now)

        return False

    async def dispatch(self, request: Request, call_next):
        # 只對 webhook 端點進行速率限制
        if request.url.path.startswith("/api/v1/ingest/"):
            client_id = self.get_client_id(request)

            if self.is_rate_limited(client_id):
                logger.warning(f"Rate limit exceeded for client {client_id}")
                return JSONResponse(
                    status_code=429, content={"error": "Rate limit exceeded"}
                )

        response = await call_next(request)
        return response


class WebhookSecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.replay_window = 300  # 5 分鐘重放窗口
        self.timestamp_cache = set()

    def is_replay_attack(self, request: Request) -> bool:
        """檢測重放攻擊"""
        timestamp_header = request.headers.get("x-timestamp")
        if not timestamp_header:
            return False

        try:
            timestamp = int(timestamp_header)
            current_time = int(time.time())

            # 檢查時間窗口
            if abs(current_time - timestamp) > self.replay_window:
                return True

            # 檢查是否已見過此時間戳
            client_ip = request.client.host if request.client else "unknown"
            request_id = f"{client_ip}:{timestamp}"
            if request_id in self.timestamp_cache:
                return True

            self.timestamp_cache.add(request_id)

            # 清理舊緩存
            self.timestamp_cache = {
                req_id
                for req_id in self.timestamp_cache
                if abs(current_time - int(req_id.split(":")[1])) <= self.replay_window
            }

            return False
        except (ValueError, IndexError):
            return False

    async def dispatch(self, request: Request, call_next):
        # 檢查重放攻擊
        if request.url.path.startswith("/api/v1/ingest/"):
            if self.is_replay_attack(request):
                client_ip = request.client.host if request.client else "unknown"
                logger.warning(f"Potential replay attack from {client_ip}")
                return JSONResponse(
                    status_code=403, content={"error": "Request timestamp invalid"}
                )

        response = await call_next(request)
        return response
