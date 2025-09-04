"""
統計數據 API 端點
只處理 HTTP 路由和請求/響應，業務邏輯由服務層處理
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.api.v1.deps import get_authenticated_db, get_api_key
from app.services.stats_service import stats_service

router = APIRouter(dependencies=[Depends(get_api_key)])


@router.get("/overview")
async def get_overview_stats(
    db: AsyncSession = Depends(get_authenticated_db),
) -> Dict[str, Any]:
    """
    獲取系統總覽統計

    **包含指標：**
    - 總 webhook 數量
    - 今日/本週 webhook 數量
    - 活躍訂閱數
    - 成功率（最近 24 小時）
    - 最近事件列表
    - 系統健康狀態

    **用途：** 適合儀表板首頁顯示系統整體狀況
    """
    return await stats_service.get_overview_stats(db)


@router.get("/activity")
async def get_activity_stats(
    days: int = 7, db: AsyncSession = Depends(get_authenticated_db)
) -> Dict[str, Any]:
    """
    獲取活動統計數據

    **包含數據：**
    - 每日 webhook 數量趨勢
    - 今日每小時 webhook 分布

    **參數：**
    - `days`: 統計天數（預設 7 天）

    **用途：** 適合製作趨勢圖表，分析系統使用模式
    """
    return await stats_service.get_activity_stats(days, db)


@router.get("/sources")
async def get_source_stats(
    db: AsyncSession = Depends(get_authenticated_db),
) -> Dict[str, Any]:
    """
    獲取按來源分組的統計數據

    **包含數據：**
    - 各來源的 webhook 數量
    - 各來源的主題數量

    **用途：** 瞭解哪些外部服務使用最頻繁
    """
    return await stats_service.get_source_stats(db)
