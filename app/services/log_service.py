"""
日誌服務
處理事件日誌和派發日誌的業務邏輯
"""

from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, update
from fastapi import HTTPException
from app.db.models import EventLog, DispatchLog, EventLogStatus, DispatchLogStatus
from app.schemas.log import (
    EventLogResponse,
    DispatchLogResponse,
    EventLogListResponse,
    DispatchLogListResponse,
)


class LogService:
    """日誌服務類"""

    async def get_event_logs(
        self,
        db: AsyncSession,
        topic_id: Optional[str] = None,
        status: Optional[EventLogStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> EventLogListResponse:
        """
        獲取事件日誌列表

        Args:
            db: 數據庫會話
            topic_id: 可選，過濾特定主題的事件
            status: 可選，過濾特定狀態的事件
            skip: 跳過的記錄數
            limit: 返回的記錄數

        Returns:
            EventLogListResponse: 事件日誌列表響應
        """
        # 建立基礎查詢
        query = select(EventLog)
        count_query = select(func.count(EventLog.id))

        # 加入過濾條件
        conditions = []
        if topic_id:
            conditions.append(EventLog.topic_id == topic_id)
        if status:
            conditions.append(EventLog.status == status)

        if conditions:
            query = query.where(*conditions)
            count_query = count_query.where(*conditions)

        # 獲取總數
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 加入排序和分頁
        query = query.order_by(desc(EventLog.received_at)).offset(skip).limit(limit)

        # 執行查詢
        result = await db.execute(query)
        events = result.scalars().all()

        return EventLogListResponse(
            items=[EventLogResponse.model_validate(event) for event in events],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def get_event_log_by_id(
        self, db: AsyncSession, event_id: str
    ) -> EventLogResponse:
        """
        根據 ID 獲取特定事件日誌

        Args:
            db: 數據庫會話
            event_id: 事件日誌 ID

        Returns:
            EventLogResponse: 事件日誌響應

        Raises:
            HTTPException: 如果事件不存在
        """
        query = select(EventLog).where(EventLog.id == event_id)
        result = await db.execute(query)
        event = result.scalar_one_or_none()

        if not event:
            raise HTTPException(status_code=404, detail="事件日誌不存在")

        return EventLogResponse.model_validate(event)

    async def create_event_log(
        self,
        db: AsyncSession,
        topic_id: str,
        content_type: str,
        payload: str,
        headers: dict[str, str],
        source_ip: str,
        status: EventLogStatus,
        is_test: bool = False,
    ) -> EventLog:
        """
        創建事件記錄

        Args:
            topic_id: 主題 ID
            content_type: 內容類型
            payload: 請求體內容
            headers: 請求頭
            source_ip: 來源IP
            status: 事件狀態
            db: 數據庫會話
            is_test: 是否為測試事件（預設為 False）

        Returns:
            EventLog: 創建的事件記錄
        """
        # 將 headers 標準化為小寫鍵的字典，並確保值為字串
        normalized_headers = {str(k).lower(): str(v) for k, v in headers.items()}

        event_log = EventLog(
            topic_id=topic_id,
            content_type=content_type,
            payload=payload,
            headers=normalized_headers,
            source_ip=source_ip,
            status=status,  # 使用枚舉的值
            is_test=is_test,
        )

        db.add(event_log)
        await db.commit()
        await db.refresh(event_log)

        return event_log

    async def update_event_status(
        self, event_log: EventLog, status: EventLogStatus, db: AsyncSession
    ) -> None:
        """
        更新事件狀態

        Args:
            event_log: 事件記錄
            status: 新狀態
            db: 數據庫會話
        """
        # 使用 SQLAlchemy 更新記錄
        await db.execute(
            update(EventLog).where(EventLog.id == event_log.id).values(status=status)
        )
        await db.commit()

    async def get_dispatch_logs(
        self,
        db: AsyncSession,
        event_log_id: Optional[str] = None,
        subscription_id: Optional[str] = None,
        status: Optional[DispatchLogStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> DispatchLogListResponse:
        """
        獲取派發日誌列表

        Args:
            db: 數據庫會話
            event_log_id: 可選，過濾特定事件的派發記錄
            subscription_id: 可選，過濾特定訂閱的派發記錄
            status: 可選，過濾特定狀態的派發記錄
            skip: 跳過的記錄數
            limit: 返回的記錄數

        Returns:
            DispatchLogListResponse: 派發日誌列表響應
        """
        # 建立基礎查詢
        query = select(DispatchLog)
        count_query = select(func.count(DispatchLog.id))

        # 加入過濾條件
        conditions = []
        if event_log_id:
            conditions.append(DispatchLog.event_log_id == event_log_id)
        if subscription_id:
            conditions.append(DispatchLog.subscription_id == subscription_id)
        if status:
            conditions.append(DispatchLog.status == status)

        if conditions:
            query = query.where(*conditions)
            count_query = count_query.where(*conditions)

        # 獲取總數
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 加入排序和分頁
        query = (
            query.order_by(desc(DispatchLog.dispatched_at)).offset(skip).limit(limit)
        )

        # 執行查詢
        result = await db.execute(query)
        dispatches = result.scalars().all()

        return DispatchLogListResponse(
            items=[
                DispatchLogResponse.model_validate(dispatch) for dispatch in dispatches
            ],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def get_dispatch_log_by_id(
        self, db: AsyncSession, dispatch_id: str
    ) -> DispatchLogResponse:
        """
        根據 ID 獲取特定派發日誌

        Args:
            db: 數據庫會話
            dispatch_id: 派發日誌 ID

        Returns:
            DispatchLogResponse: 派發日誌響應

        Raises:
            HTTPException: 如果派發記錄不存在
        """
        query = select(DispatchLog).where(DispatchLog.id == dispatch_id)
        result = await db.execute(query)
        dispatch = result.scalar_one_or_none()

        if not dispatch:
            raise HTTPException(status_code=404, detail="派發日誌不存在")

        return DispatchLogResponse.model_validate(dispatch)

    async def create_dispatch_log(
        self,
        db: AsyncSession,
        event_log_id: str,
        subscription_id: str,
        status: DispatchLogStatus,
        response_status_code: int,
        response_body: str,
    ) -> DispatchLog:
        """
        創建派發日誌
        """
        dispatch_log = DispatchLog(
            event_log_id=event_log_id,
            subscription_id=subscription_id,
            status=status,
            response_status_code=response_status_code,
            response_body=response_body,
        )
        db.add(dispatch_log)
        await db.commit()
        await db.refresh(dispatch_log)
        return dispatch_log


# 創建服務實例
log_service = LogService()
