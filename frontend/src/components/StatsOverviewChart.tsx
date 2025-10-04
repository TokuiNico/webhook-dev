import { useState, useEffect } from 'react'
import { statsService } from '../services/statsService'
import type { OverviewStats, ChartData, StatsApiResponse } from '../types/stats'

interface StatsOverviewChartProps {
  /** 自定義 CSS 類名 */
  className?: string
  /** 是否自動刷新 */
  autoRefresh?: boolean
  /** 刷新間隔（毫秒） */
  refreshInterval?: number
}

/**
 * 統計總覽圖表元件
 * 展示系統層級的關鍵統計數據，使用圖表形式呈現
 */
export const StatsOverviewChart = ({
  className = '',
  autoRefresh = true,
  refreshInterval = 30000 // 30 秒
}: StatsOverviewChartProps) => {
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 載入統計數據
  const loadStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const response: StatsApiResponse<OverviewStats> = await statsService.getOverviewStats()

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setOverviewStats(response.data)
        setLastUpdate(new Date())
      }
    } catch (err) {
      setError('載入統計數據失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入
  useEffect(() => {
    loadStats()
  }, [])

  // 自動刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // 格式化數值顯示
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // 格式化百分比
  const formatPercentage = (rate: number): string => {
    return (rate * 100).toFixed(1) + '%'
  }

  // 獲取健康狀態顏色
  const getHealthColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100'
      case 'warning':
        return 'text-yellow-600 bg-yellow-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // 載入狀態
  if (loading && !overviewStats) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error && !overviewStats) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadStats}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  if (!overviewStats) return null

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      {/* 頁面標題和最後更新時間 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">系統統計總覽</h2>
          <p className="text-sm text-gray-600">即時系統運營指標</p>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              最後更新: {lastUpdate.toLocaleTimeString('zh-TW')}
            </span>
          )}
          {autoRefresh && (
            <button
              onClick={loadStats}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
            >
              {loading ? '刷新中...' : '刷新'}
            </button>
          )}
        </div>
      </div>

      {/* 關鍵指標卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 總 webhook 數量 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">總 Webhook</p>
              <p className="text-2xl font-bold">{formatNumber(overviewStats.total_webhooks)}</p>
            </div>
            <svg className="w-8 h-8 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* 今日 webhook */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">今日 Webhook</p>
              <p className="text-2xl font-bold">{formatNumber(overviewStats.today_webhooks)}</p>
            </div>
            <svg className="w-8 h-8 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* 活躍訂閱 */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">活躍訂閱</p>
              <p className="text-2xl font-bold">{overviewStats.active_subscriptions}</p>
            </div>
            <svg className="w-8 h-8 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* 成功率 */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">成功率</p>
              <p className="text-2xl font-bold">{formatPercentage(overviewStats.success_rate)}</p>
            </div>
            <svg className="w-8 h-8 text-yellow-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 系統健康狀態 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${overviewStats.system_health === 'healthy' ? 'bg-green-500' : overviewStats.system_health === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-900">系統健康狀態</span>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getHealthColor(overviewStats.system_health)}`}>
            {overviewStats.system_health === 'healthy' ? '健康' : overviewStats.system_health === 'warning' ? '警告' : '錯誤'}
          </span>
        </div>
      </div>

      {/* 近期事件列表 */}
      <div>
        <h3 className="text-md font-medium text-gray-900 mb-3">近期事件</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {overviewStats.recent_events.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">暫無近期事件</p>
          ) : (
            overviewStats.recent_events.slice(0, 10).map((event, index) => (
              <div key={`${event.id}-${index}`} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${event.status === 'success' ? 'bg-green-500' : event.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {event.topic_id}
                    </p>
                    <p className="text-xs text-gray-500">
                      來源: {event.source_id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleString('zh-TW')}
                  </p>
                  <p className={`text-xs font-medium ${event.status === 'success' ? 'text-green-600' : event.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {event.status === 'success' ? '成功' : event.status === 'failed' ? '失敗' : '處理中'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
