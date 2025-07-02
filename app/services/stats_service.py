"""
統計數據服務
處理所有統計數據相關的業務邏輯
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.models import EventLog, DispatchLog, Subscription, Topic, Source

class StatsService:
    """統計數據服務類"""

    async def get_overview_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """
        獲取系統總覽統計數據

        Args:
            db: 數據庫會話

        Returns:
            Dict[str, Any]: 包含各種統計指標的字典
        """
        # 計算時間範圍
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)

        # 並行執行所有統計查詢
        stats = await self._execute_parallel_queries(db, today_start, week_start)

        # 獲取最近事件
        recent_events = await self._get_recent_events(db)

        return {
            "total_webhooks": stats["total_webhooks"],
            "today_webhooks": stats["today_webhooks"],
            "week_webhooks": stats["week_webhooks"],
            "active_subscriptions": stats["active_subscriptions"],
            "total_subscriptions": stats["total_subscriptions"],
            "success_rate": stats["success_rate"],
            "recent_events": recent_events,
            "system_status": self._determine_system_status(stats)
        }

    async def get_activity_stats(
        self,
        days: int,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        獲取活動統計數據

        Args:
            days: 統計天數
            db: 數據庫會話

        Returns:
            Dict[str, Any]: 活動統計數據
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # 獲取每日統計
        daily_activity = await self._get_daily_activity(db, start_date)

        # 獲取今日每小時統計
        hourly_activity = await self._get_hourly_activity(db, end_date)

        return {
            "daily_activity": daily_activity,
            "hourly_activity": hourly_activity,
            "period_days": days
        }

    async def get_source_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """
        獲取按來源分組的統計數據

        Args:
            db: 數據庫會話

        Returns:
            Dict[str, Any]: 來源統計數據
        """
        # 獲取各來源的 webhook 統計
        source_stats_result = await db.execute(
            select(
                Source.name,
                func.count(EventLog.id).label('webhook_count'),
                func.count(
                    func.distinct(Topic.id)
                ).label('topic_count')
            )
            .join(Topic, Source.id == Topic.source_id)
            .outerjoin(EventLog, Topic.id == EventLog.topic_id)
            .group_by(Source.id, Source.name)
            .order_by(func.count(EventLog.id).desc())
        )

        source_stats = [
            {
                "source": row.name,
                "webhook_count": row.webhook_count,
                "topic_count": row.topic_count
            }
            for row in source_stats_result.all()
        ]

        return {"source_statistics": source_stats}

    # 私有方法
    async def _execute_parallel_queries(
        self,
        db: AsyncSession,
        today_start: datetime,
        week_start: datetime
    ) -> Dict[str, Any]:
        """執行並行統計查詢"""

        # 總 webhook 數
        total_webhooks_result = await db.execute(
            select(func.count(EventLog.id))
        )
        total_webhooks = total_webhooks_result.scalar() or 0

        # 今日 webhook 數
        today_webhooks_result = await db.execute(
            select(func.count(EventLog.id)).where(
                EventLog.received_at >= today_start
            )
        )
        today_webhooks = today_webhooks_result.scalar() or 0

        # 本週 webhook 數
        week_webhooks_result = await db.execute(
            select(func.count(EventLog.id)).where(
                EventLog.received_at >= week_start
            )
        )
        week_webhooks = week_webhooks_result.scalar() or 0

        # 活躍訂閱數
        active_subscriptions_result = await db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.is_active == True
            )
        )
        active_subscriptions = active_subscriptions_result.scalar() or 0

        # 總訂閱數
        total_subscriptions_result = await db.execute(
            select(func.count(Subscription.id))
        )
        total_subscriptions = total_subscriptions_result.scalar() or 0

        # 成功率計算
        success_rate = await self._calculate_success_rate(db, today_start)

        return {
            "total_webhooks": total_webhooks,
            "today_webhooks": today_webhooks,
            "week_webhooks": week_webhooks,
            "active_subscriptions": active_subscriptions,
            "total_subscriptions": total_subscriptions,
            "success_rate": success_rate
        }

    async def _calculate_success_rate(
        self,
        db: AsyncSession,
        today_start: datetime
    ) -> float:
        """計算成功率"""

        successful_dispatches_result = await db.execute(
            select(func.count(DispatchLog.id)).where(
                and_(
                    DispatchLog.dispatched_at >= today_start,
                    DispatchLog.status == "success"
                )
            )
        )
        successful_dispatches = successful_dispatches_result.scalar() or 0

        total_dispatches_result = await db.execute(
            select(func.count(DispatchLog.id)).where(
                DispatchLog.dispatched_at >= today_start
            )
        )
        total_dispatches = total_dispatches_result.scalar() or 0

        return round(
            (successful_dispatches / total_dispatches * 100) if total_dispatches > 0 else 0,
            2
        )

    async def _get_recent_events(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """獲取最近的事件"""

        recent_events_result = await db.execute(
            select(EventLog, Topic, Source)
            .join(Topic, EventLog.topic_id == Topic.id)
            .join(Source, Topic.source_id == Source.id)
            .order_by(EventLog.received_at.desc())
            .limit(10)
        )

        return [
            {
                "id": event.id,
                "source": source.name,
                "topic": topic.name,
                "status": event.status.value,
                "received_at": event.received_at.isoformat(),
                "content_type": event.content_type
            }
            for event, topic, source in recent_events_result.all()
        ]

    async def _get_daily_activity(
        self,
        db: AsyncSession,
        start_date: datetime
    ) -> List[Dict[str, Any]]:
        """獲取每日活動統計"""

        daily_counts_result = await db.execute(
            select(
                func.date(EventLog.received_at).label('date'),
                func.count(EventLog.id).label('count')
            )
            .where(EventLog.received_at >= start_date)
            .group_by(func.date(EventLog.received_at))
            .order_by(func.date(EventLog.received_at))
        )

        return [
            {
                "date": str(row.date),
                "webhooks": row.count
            }
            for row in daily_counts_result.all()
        ]

    async def _get_hourly_activity(
        self,
        db: AsyncSession,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """獲取今日每小時活動統計"""

        today_start = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
        hourly_counts_result = await db.execute(
            select(
                func.extract('hour', EventLog.received_at).label('hour'),
                func.count(EventLog.id).label('count')
            )
            .where(EventLog.received_at >= today_start)
            .group_by(func.extract('hour', EventLog.received_at))
            .order_by(func.extract('hour', EventLog.received_at))
        )

        return [
            {
                "hour": int(row.hour),
                "webhooks": row.count
            }
            for row in hourly_counts_result.all()
        ]

    def _determine_system_status(self, stats: Dict[str, Any]) -> str:
        """根據統計數據確定系統狀態"""

        success_rate = stats.get("success_rate", 0)

        if success_rate >= 95:
            return "healthy"
        elif success_rate >= 85:
            return "warning"
        else:
            return "critical"

# 全局服務實例
stats_service = StatsService()
