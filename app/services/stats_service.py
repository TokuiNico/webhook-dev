"""
統計數據服務
處理所有統計數據相關的業務邏輯
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case

from app.db.models import EventLog, DispatchLog, DispatchLogStatus, Subscription, Topic, Source


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
            "system_status": self._determine_system_status(stats),
        }

    async def get_activity_stats(self, days: int, db: AsyncSession) -> Dict[str, Any]:
        """
        獲取活動統計數據

        Args:
            days: 統計天數
            db: 數據庫會話

        Returns:
            Dict[str, Any]: 活動統計數據
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)

            # 獲取每日統計
            daily_trend = await self._get_daily_trend(db, start_date)

            # 獲取今日每小時統計
            hourly_distribution = await self._get_hourly_distribution(db, end_date)

            return {
                "daily_trend": daily_trend,
                "hourly_distribution": hourly_distribution,
            }
        except Exception as e:
            print(f"Error in get_activity_stats: {e}")
            import traceback
            traceback.print_exc()
            raise

    async def get_source_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """
        獲取按來源分組的統計數據

        Args:
            db: 數據庫會話

        Returns:
            Dict[str, Any]: 來源統計數據
        """
        # 獲取各來源的 webhook 統計（排除測試事件）
        source_stats_result = await db.execute(
            select(
                Source.name,
                func.count(EventLog.id).label("webhook_count"),
                func.count(func.distinct(Topic.id)).label("topic_count"),
            )
            .join(Topic, Source.id == Topic.source_id)
            .outerjoin(EventLog, and_(Topic.id == EventLog.topic_id, EventLog.is_test == False))
            .group_by(Source.id, Source.name)
            .order_by(func.count(EventLog.id).desc())
        )

        source_stats = [
            {
                "source": row.name,
                "webhook_count": row.webhook_count,
                "topic_count": row.topic_count,
            }
            for row in source_stats_result.all()
        ]

        return {"source_statistics": source_stats}

    async def get_topic_stats(self, topic_id: str, db: AsyncSession) -> Dict[str, Any]:
        """
        獲取特定主題的統計數據

        Args:
            topic_id: 主題 ID
            db: 數據庫會話

        Returns:
            Dict[str, Any]: 主題統計數據
        """
        # 獲取 webhook 數量 (event_logs 數量，排除測試事件)
        webhook_count_result = await db.execute(
            select(func.count(EventLog.id)).where(
                and_(EventLog.topic_id == topic_id, EventLog.is_test == False)
            )
        )
        webhook_count = webhook_count_result.scalar() or 0

        # 獲取訂閱者數量 (subscriptions 數量)
        subscriber_count_result = await db.execute(
            select(func.count(Subscription.id)).where(Subscription.topic_id == topic_id)
        )
        subscriber_count = subscriber_count_result.scalar() or 0

        # 獲取最後活動時間 (最新 event_log 的 received_at，排除測試事件)
        last_activity_result = await db.execute(
            select(EventLog.received_at)
            .where(and_(EventLog.topic_id == topic_id, EventLog.is_test == False))
            .order_by(EventLog.received_at.desc())
            .limit(1)
        )
        last_activity_row = last_activity_result.first()
        last_activity = last_activity_row.received_at.isoformat() if last_activity_row else None

        return {
            "webhook_count": webhook_count,
            "subscriber_count": subscriber_count,
            "last_activity": last_activity,
        }

    # 私有方法
    async def _execute_parallel_queries(
        self, db: AsyncSession, today_start: datetime, week_start: datetime
    ) -> Dict[str, Any]:
        """執行並行統計查詢"""

        # 總 webhook 數（排除測試事件）
        total_webhooks_result = await db.execute(
            select(func.count(EventLog.id)).where(EventLog.is_test == False)
        )
        total_webhooks = total_webhooks_result.scalar() or 0

        # 今日 webhook 數（排除測試事件）
        today_webhooks_result = await db.execute(
            select(func.count(EventLog.id)).where(
                and_(EventLog.received_at >= today_start, EventLog.is_test == False)
            )
        )
        today_webhooks = today_webhooks_result.scalar() or 0

        # 本週 webhook 數（排除測試事件）
        week_webhooks_result = await db.execute(
            select(func.count(EventLog.id)).where(
                and_(EventLog.received_at >= week_start, EventLog.is_test == False)
            )
        )
        week_webhooks = week_webhooks_result.scalar() or 0

        # 活躍訂閱數
        active_subscriptions_result = await db.execute(
            select(func.count(Subscription.id)).where(Subscription.is_active)
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
            "success_rate": success_rate,
        }

    async def _calculate_success_rate(
        self, db: AsyncSession, today_start: datetime
    ) -> float:
        """計算成功率（排除測試事件）"""

        successful_dispatches_result = await db.execute(
            select(func.count(DispatchLog.id))
            .join(EventLog, DispatchLog.event_log_id == EventLog.id)
            .where(
                and_(
                    DispatchLog.dispatched_at >= today_start,
                    DispatchLog.status == DispatchLogStatus.SUCCESS,
                    EventLog.is_test == False,
                )
            )
        )
        successful_dispatches = successful_dispatches_result.scalar() or 0

        total_dispatches_result = await db.execute(
            select(func.count(DispatchLog.id))
            .join(EventLog, DispatchLog.event_log_id == EventLog.id)
            .where(
                and_(
                    DispatchLog.dispatched_at >= today_start,
                    EventLog.is_test == False,
                )
            )
        )
        total_dispatches = total_dispatches_result.scalar() or 0

        return round(
            (successful_dispatches / total_dispatches * 100)
            if total_dispatches > 0
            else 0,
            2,
        )

    async def _get_recent_events(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """獲取最近的事件"""

        recent_events_result = await db.execute(
            select(EventLog, Topic, Source)
            .join(Topic, EventLog.topic_id == Topic.id)
            .join(Source, Topic.source_id == Source.id)
            .where(EventLog.is_test == False)
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
                "content_type": event.content_type,
            }
            for event, topic, source in recent_events_result.all()
        ]

    async def _get_daily_trend(
        self, db: AsyncSession, start_date: datetime
    ) -> List[Dict[str, Any]]:
        """獲取每日趨勢統計"""

        # 獲取每日總數 (來自 EventLog，排除測試事件)
        daily_total_result = await db.execute(
            select(
                func.date(EventLog.received_at).label("date"),
                func.count(EventLog.id).label("total"),
            )
            .where(and_(EventLog.received_at >= start_date, EventLog.is_test == False))
            .group_by(func.date(EventLog.received_at))
        )

        # 獲取每日成功數和失敗數 (來自 DispatchLog，排除測試事件)
        daily_dispatch_result = await db.execute(
            select(
                func.date(EventLog.received_at).label("date"),
                func.sum(case((DispatchLog.status == DispatchLogStatus.SUCCESS, 1), else_=0)).label("success"),
                func.sum(case((DispatchLog.status == DispatchLogStatus.FAILED, 1), else_=0)).label("failed"),
            )
            .select_from(DispatchLog)
            .join(EventLog, DispatchLog.event_log_id == EventLog.id)
            .where(and_(EventLog.received_at >= start_date, EventLog.is_test == False))
            .group_by(func.date(EventLog.received_at))
        )

        # 合併數據
        total_dict = {str(row.date): row.total for row in daily_total_result.all()}
        dispatch_dict = {str(row.date): {"success": row.success or 0, "failed": row.failed or 0}
                        for row in daily_dispatch_result.all()}

        # 組合結果
        all_dates = set(total_dict.keys()) | set(dispatch_dict.keys())

        # 如果沒有資料，至少返回今天和昨天的資料結構
        if not all_dates:
            end_date = datetime.utcnow()
            for i in range(7):  # 過去7天
                date_str = (end_date - timedelta(days=i)).strftime('%Y-%m-%d')
                all_dates.add(date_str)

        result = []
        for date in sorted(all_dates, reverse=True):  # 最新的日期在前
            result.append({
                "date": date,
                "total": int(total_dict.get(date, 0)),
                "success": int(dispatch_dict.get(date, {}).get("success", 0)),
                "failed": int(dispatch_dict.get(date, {}).get("failed", 0))
            })

        return result

    async def _get_hourly_distribution(
        self, db: AsyncSession, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """獲取今日每小時分布統計"""

        today_start = end_date.replace(hour=0, minute=0, second=0, microsecond=0)

        # 獲取每小時總數 (來自 EventLog，排除測試事件)
        hourly_total_result = await db.execute(
            select(
                func.extract("hour", EventLog.received_at).label("hour"),
                func.count(EventLog.id).label("total"),
            )
            .where(and_(EventLog.received_at >= today_start, EventLog.is_test == False))
            .group_by(func.extract("hour", EventLog.received_at))
        )

        # 獲取每小時成功數和失敗數 (來自 DispatchLog，排除測試事件)
        hourly_dispatch_result = await db.execute(
            select(
                func.extract("hour", EventLog.received_at).label("hour"),
                func.sum(case((DispatchLog.status == DispatchLogStatus.SUCCESS, 1), else_=0)).label("success"),
                func.sum(case((DispatchLog.status == DispatchLogStatus.FAILED, 1), else_=0)).label("failed"),
            )
            .select_from(DispatchLog)
            .join(EventLog, DispatchLog.event_log_id == EventLog.id)
            .where(and_(EventLog.received_at >= today_start, EventLog.is_test == False))
            .group_by(func.extract("hour", EventLog.received_at))
        )

        # 合併數據
        total_dict = {int(row.hour): row.total for row in hourly_total_result.all()}
        dispatch_dict = {int(row.hour): {"success": row.success or 0, "failed": row.failed or 0}
                        for row in hourly_dispatch_result.all()}

        # 組合結果
        all_hours = set(total_dict.keys()) | set(dispatch_dict.keys())

        # 如果沒有資料，至少返回所有小時的資料結構 (0-23)
        if not all_hours:
            all_hours = set(range(24))

        result = []
        for hour in sorted(all_hours):
            result.append({
                "hour": hour,
                "total": int(total_dict.get(hour, 0)),
                "success": int(dispatch_dict.get(hour, {}).get("success", 0)),
                "failed": int(dispatch_dict.get(hour, {}).get("failed", 0))
            })

        return result

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
