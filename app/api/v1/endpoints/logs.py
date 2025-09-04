"""
日誌管理 API 端點
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.deps import get_authenticated_db, get_api_key
from app.db.models import EventLogStatus, DispatchLogStatus
from app.schemas.log import (
    EventLogResponse,
    DispatchLogResponse,
    EventLogListResponse,
    DispatchLogListResponse
)
from app.services.log_service import log_service

router = APIRouter(dependencies=[Depends(get_api_key)])


@router.get("/events/", response_model=EventLogListResponse)
async def list_event_logs(
    topic_id: Optional[str] = Query(None, description="過濾特定主題的事件"),
    status: Optional[EventLogStatus] = Query(None, description="過濾特定狀態的事件"),
    skip: int = Query(0, ge=0, description="跳過的記錄數"),
    limit: int = Query(100, ge=1, le=1000, description="返回的記錄數"),
    db: AsyncSession = Depends(get_authenticated_db),
) -> EventLogListResponse:
    """
    列出事件日誌

    查詢所有或過濾後的事件日誌記錄，按接收時間倒序排列。

    **查詢參數：**
    - `topic_id`: 可選，過濾特定主題的事件
    - `status`: 可選，過濾特定狀態的事件（RECEIVED, QUEUED, FAILED_VALIDATION 等）
    - `skip`: 跳過的記錄數（用於分頁）
    - `limit`: 返回的記錄數（最大 1000）

    **返回格式：**
    ```json
    {
        "items": [
            {
                "id": "01K4AN2JMK0SS161X6G5F30QSD",
                "topic_id": "01K4AN2JKWCDJSBXAW1DDHRTMJ",
                "source_ip": "127.0.0.1",
                "content_type": "application/json",
                "status": "QUEUED",
                "received_at": "2025-09-04T15:21:13.107470"
            }
        ],
        "total": 1,
        "skip": 0,
        "limit": 100
    }
    ```
    """
    return await log_service.get_event_logs(
        db=db,
        topic_id=topic_id,
        status=status,
        skip=skip,
        limit=limit
    )


@router.get("/events/{event_id}", response_model=EventLogResponse)
async def get_event_log(
    event_id: str,
    db: AsyncSession = Depends(get_authenticated_db),
) -> EventLogResponse:
    """
    獲取特定事件日誌的詳細信息

    **路徑參數：**
    - `event_id`: 事件日誌 ID (ULID 格式)

    **返回格式：**
    ```json
    {
        "id": "01K4AN2JMK0SS161X6G5F30QSD",
        "topic_id": "01K4AN2JKWCDJSBXAW1DDHRTMJ",
        "source_ip": "127.0.0.1",
        "headers": {"Content-Type": "application/json"},
        "content_type": "application/json",
        "payload": "{\"event\": \"test\"}",
        "status": "QUEUED",
        "received_at": "2025-09-04T15:21:13.107470"
    }
    ```
    """
    return await log_service.get_event_log_by_id(db=db, event_id=event_id)


@router.get("/dispatches/", response_model=DispatchLogListResponse)
async def list_dispatch_logs(
    event_log_id: Optional[str] = Query(None, description="過濾特定事件的派發記錄"),
    subscription_id: Optional[str] = Query(None, description="過濾特定訂閱的派發記錄"),
    status: Optional[DispatchLogStatus] = Query(None, description="過濾特定狀態的派發記錄"),
    skip: int = Query(0, ge=0, description="跳過的記錄數"),
    limit: int = Query(100, ge=1, le=1000, description="返回的記錄數"),
    db: AsyncSession = Depends(get_authenticated_db),
) -> DispatchLogListResponse:
    """
    列出派發日誌

    查詢所有或過濾後的派發日誌記錄，按派發時間倒序排列。

    **查詢參數：**
    - `event_log_id`: 可選，過濾特定事件的派發記錄
    - `subscription_id`: 可選，過濾特定訂閱的派發記錄
    - `status`: 可選，過濾特定狀態的派發記錄
    - `skip`: 跳過的記錄數（用於分頁）
    - `limit`: 返回的記錄數（最大 1000）

    **返回格式：**
    ```json
    {
        "items": [
            {
                "id": "01K4AN2JMK0SS161X6G5F30QSE",
                "event_log_id": "01K4AN2JMK0SS161X6G5F30QSD",
                "subscription_id": "01K4AN2JM7Z4S4CRRC086F8BQF",
                "attempt": 1,
                "status": "SUCCESS",
                "response_status_code": 200,
                "dispatched_at": "2025-09-04T15:21:13.107470"
            }
        ],
        "total": 1,
        "skip": 0,
        "limit": 100
    }
    ```
    """
    return await log_service.get_dispatch_logs(
        db=db,
        event_log_id=event_log_id,
        subscription_id=subscription_id,
        status=status,
        skip=skip,
        limit=limit
    )


@router.get("/dispatches/{dispatch_id}", response_model=DispatchLogResponse)
async def get_dispatch_log(
    dispatch_id: str,
    db: AsyncSession = Depends(get_authenticated_db),
) -> DispatchLogResponse:
    """
    獲取特定派發日誌的詳細信息

    **路徑參數：**
    - `dispatch_id`: 派發日誌 ID (ULID 格式)

    **返回格式：**
    ```json
    {
        "id": "01K4AN2JMK0SS161X6G5F30QSE",
        "event_log_id": "01K4AN2JMK0SS161X6G5F30QSD",
        "subscription_id": "01K4AN2JM7Z4S4CRRC086F8BQF",
        "attempt": 1,
        "status": "SUCCESS",
        "response_status_code": 200,
        "response_body": "{\"success\": true}",
        "dispatched_at": "2025-09-04T15:21:13.107470"
    }
    ```
    """
    return await log_service.get_dispatch_log_by_id(db=db, dispatch_id=dispatch_id)
