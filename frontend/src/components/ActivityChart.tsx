import { useState, useEffect } from 'react'
import { statsService } from '../services/statsService'
import type { ActivityStats, TimeRange, ChartData, StatsApiResponse } from '../types/stats'

interface ActivityChartProps {
  /** 自定義 CSS 類名 */
  className?: string
  /** 初始時間範圍 */
  initialTimeRange?: TimeRange
  /** 是否顯示控制項 */
  showControls?: boolean
  /** 高度 */
  height?: number
}

/**
 * 活動統計圖表元件
 * 顯示 webhook 活動趨勢，支持不同時間範圍的選擇
 */
export const ActivityChart = ({
  className = '',
  initialTimeRange = '7d',
  showControls = true,
  height = 400
}: ActivityChartProps) => {
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 載入統計數據
  const loadStats = async (days?: number) => {
    setLoading(true)
    setError(null)

    try {
      const daysToFetch = days || getDaysFromTimeRange(timeRange)
      const response: StatsApiResponse<ActivityStats> = await statsService.getActivityStats(daysToFetch)

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setActivityStats(response.data)
        setLastUpdate(new Date())
      }
    } catch (err) {
      setError('載入活動統計失敗')
    } finally {
      setLoading(false)
    }
  }

  // 將 TimeRange 轉換為天數
  const getDaysFromTimeRange = (range: TimeRange): number => {
    switch (range) {
      case '1d': return 1
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      default: return 7
    }
  }

  // 處理時間範圍變更
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setTimeRange(newRange)
    loadStats(getDaysFromTimeRange(newRange))
  }

  // 初始化載入
  useEffect(() => {
    loadStats()
  }, [])

  // 匯出圖表
  const handleExport = async (format: 'png' | 'jpg' | 'csv' | 'json' = 'png') => {
    if (!activityStats) return

    try {
      if (format === 'csv' || format === 'json') {
        // 匯出數據
        const chartData = statsService.transformToChartData(activityStats, 'daily_trend', 'line')
        const dataToExport = format === 'csv' ? convertToCSV(chartData) : JSON.stringify(chartData, null, 2)

        const blob = new Blob([dataToExport], {
          type: format === 'csv' ? 'text/csv' : 'application/json'
        })
        downloadBlob(blob, `activity-chart.${format}`)
      } else {
        // 匯出圖片
        const chartData = statsService.transformToChartData(activityStats, 'daily_trend', 'line')
        const blob = await statsService.exportChart(chartData, format)
        downloadBlob(blob, `activity-chart.${format}`)
      }
    } catch (err) {
      console.error('匯出圖表失敗:', err)
      alert('匯出失敗，請稍後再試')
    }
  }

  // 將圖表數據轉換為 CSV
  const convertToCSV = (chartData: ChartData): string => {
    const headers = ['Date', ...chartData.datasets.map(ds => ds.label)]
    const rows = chartData.labels.map((label, index) => [
      label,
      ...chartData.datasets.map(ds => ds.data[index]?.toString() || '0')
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  // 下載 Blob
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 載入狀態
  if (loading && !activityStats) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className={`bg-gray-200 rounded mb-4`} style={{ height: `${height}px` }}></div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error && !activityStats) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => loadStats()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  if (!activityStats) return null

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      {/* 頁面標題和控制項 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">活動統計趨勢</h2>
          <p className="text-sm text-gray-600">Webhook 活動量時間序列分析</p>
        </div>

        <div className="flex items-center space-x-4">
          {showControls && (
            <>
              {/* 時間範圍選擇 */}
              <div className="flex items-center space-x-2">
                <label htmlFor="timeRange" className="text-sm text-gray-700">時間範圍:</label>
                <select
                  id="timeRange"
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1d">1 天</option>
                  <option value="7d">7 天</option>
                  <option value="30d">30 天</option>
                  <option value="90d">90 天</option>
                </select>
              </div>

              {/* 匯出按鈕 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">匯出:</span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleExport('png')}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    title="匯出為 PNG"
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    title="匯出為 CSV"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                    title="匯出為 JSON"
                  >
                    JSON
                  </button>
                </div>
              </div>
            </>
          )}

          {lastUpdate && (
            <span className="text-xs text-gray-500">
              更新: {lastUpdate.toLocaleTimeString('zh-TW')}
            </span>
          )}
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="mb-6">
        <div
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500"
          style={{ height: `${height}px` }}
        >
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium">圖表元件預留區域</p>
            <p className="text-sm mt-1">此處將整合 Chart.js 或 D3.js 圖表庫</p>
            <p className="text-xs mt-2 text-gray-400">
              當前數據: {activityStats.daily_trend.length} 個數據點
            </p>
          </div>
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">總活動量</h3>
          <p className="text-2xl font-bold text-blue-600">
            {activityStats.daily_trend.reduce((sum, day) => sum + day.total, 0).toLocaleString()}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            期間內總 webhook 數量
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900 mb-2">平均成功率</h3>
          <p className="text-2xl font-bold text-green-600">
            {activityStats.daily_trend.length > 0
              ? (activityStats.daily_trend.reduce((sum, day) => sum + (day.success / Math.max(day.total, 1)), 0) / activityStats.daily_trend.length * 100).toFixed(1)
              : 0
            }%
          </p>
          <p className="text-xs text-green-700 mt-1">
            每日平均處理成功率
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-900 mb-2">平均失敗率</h3>
          <p className="text-2xl font-bold text-red-600">
            {activityStats.daily_trend.length > 0
              ? (activityStats.daily_trend.reduce((sum, day) => sum + (day.failed / Math.max(day.total, 1)), 0) / activityStats.daily_trend.length * 100).toFixed(1)
              : 0
            }%
          </p>
          <p className="text-xs text-red-700 mt-1">
            每日平均處理失敗率
          </p>
        </div>
      </div>
    </div>
  )
}
