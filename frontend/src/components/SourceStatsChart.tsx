import { useState, useEffect } from 'react'
import { statsService } from '../services/statsService'
import type { SourceStats, ChartData, StatsApiResponse } from '../types/stats'

interface SourceStatsChartProps {
  /** 自定義 CSS 類名 */
  className?: string
  /** 顯示模式 */
  displayMode?: 'table' | 'chart' | 'both'
  /** 排序方式 */
  sortBy?: 'webhooks' | 'topics' | 'success_rate' | 'name'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 顯示數量限制 */
  limit?: number
}

/**
 * 來源統計圖表元件
 * 顯示按來源分組的 webhook 統計數據
 */
export const SourceStatsChart = ({
  className = '',
  displayMode = 'both',
  sortBy = 'webhooks',
  sortOrder = 'desc',
  limit = 10
}: SourceStatsChartProps) => {
  const [sourceStats, setSourceStats] = useState<SourceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSort, setCurrentSort] = useState({ by: sortBy, order: sortOrder })
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 載入統計數據
  const loadStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const response: StatsApiResponse<SourceStats> = await statsService.getSourceStats()

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setSourceStats(response.data)
        setLastUpdate(new Date())
      }
    } catch (err) {
      setError('載入來源統計失敗')
    } finally {
      setLoading(false)
    }
  }

  // 處理排序
  const handleSort = (field: 'webhooks' | 'topics' | 'success_rate' | 'name') => {
    const newOrder = currentSort.by === field && currentSort.order === 'desc' ? 'asc' : 'desc'
    setCurrentSort({ by: field, order: newOrder })
  }

  // 排序來源數據
  const getSortedSources = () => {
    if (!sourceStats || !sourceStats.source_statistics) return []

    return [...sourceStats.source_statistics].sort((a, b) => {
      let aValue: any, bValue: any

      switch (currentSort.by) {
        case 'webhooks':
          aValue = a.webhook_count
          bValue = b.webhook_count
          break
        case 'topics':
          aValue = a.topic_count
          bValue = b.topic_count
          break
        case 'success_rate':
          // 由於後端沒有返回 success_rate，我們使用 webhook_count 作為備用
          aValue = a.webhook_count
          bValue = b.webhook_count
          break
        case 'name':
          aValue = a.source
          bValue = b.source
          break
        default:
          return 0
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (currentSort.order === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    }).slice(0, limit)
  }

  // 匯出數據
  const handleExport = (format: 'csv' | 'json') => {
    if (!sourceStats || !sourceStats.source_statistics) return

    try {
      const dataToExport = format === 'csv'
        ? convertToCSV(sourceStats.source_statistics)
        : JSON.stringify(sourceStats, null, 2)

      const blob = new Blob([dataToExport], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      })
      downloadBlob(blob, `source-stats.${format}`)
    } catch (err) {
      console.error('匯出數據失敗:', err)
      alert('匯出失敗，請稍後再試')
    }
  }

  // 將來源數據轉換為 CSV
  const convertToCSV = (sources: any[]): string => {
    const headers = ['來源名稱', '總 Webhook 數', '主題數', '成功率', '最後活動時間']
    const rows = sources.map(source => [
      source.source_name,
      source.total_webhooks.toString(),
      source.total_topics.toString(),
      (source.success_rate * 100).toFixed(1) + '%',
      new Date(source.last_activity).toLocaleString('zh-TW')
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

  // 格式化數值
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // 獲取成功率顏色
  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 0.95) return 'text-green-600 bg-green-100'
    if (rate >= 0.85) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // 初始化載入
  useEffect(() => {
    loadStats()
  }, [])

  // 載入狀態
  if (loading && !sourceStats) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error && !sourceStats) {
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

  if (!sourceStats) return null

  const sortedSources = getSortedSources()

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      {/* 頁面標題和控制項 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">來源統計分析</h2>
          <p className="text-sm text-gray-600">按來源分組的 webhook 處理統計</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* 匯出按鈕 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">匯出:</span>
            <div className="flex space-x-1">
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

          {lastUpdate && (
            <span className="text-xs text-gray-500">
              更新: {lastUpdate.toLocaleTimeString('zh-TW')}
            </span>
          )}
        </div>
      </div>

      {/* 圖表區域 */}
      {(displayMode === 'chart' || displayMode === 'both') && (
        <div className="mb-6">
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <p className="text-lg font-medium text-gray-900">圓餅圖 / 長條圖預留區域</p>
            <p className="text-sm text-gray-600 mt-1">顯示各來源的 webhook 數量分佈</p>
            <p className="text-xs mt-2 text-gray-400">
              數據來源: {sourceStats.source_statistics.length} 個來源
            </p>
          </div>
        </div>
      )}

      {/* 表格區域 */}
      {(displayMode === 'table' || displayMode === 'both') && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  來源名稱
                  {currentSort.by === 'name' && (
                    <span className="ml-1">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('webhooks')}
                >
                  Webhook 數量
                  {currentSort.by === 'webhooks' && (
                    <span className="ml-1">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('topics')}
                >
                  主題數
                  {currentSort.by === 'topics' && (
                    <span className="ml-1">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('success_rate')}
                >
                  成功率
                  {currentSort.by === 'success_rate' && (
                    <span className="ml-1">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最後活動
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedSources.map((source, index) => (
                <tr key={`${source.source}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{source.source}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatNumber(source.webhook_count)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{source.topic_count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSuccessRateColor(0)}`}>
                      N/A
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    N/A
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 摘要統計 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{sourceStats.source_statistics.length}</p>
            <p className="text-sm text-gray-600">總來源數</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {sourceStats.source_statistics.reduce((sum, s) => sum + s.webhook_count, 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">總 Webhook 數</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {sourceStats.source_statistics.reduce((sum, s) => sum + s.topic_count, 0)}
            </p>
            <p className="text-sm text-gray-600">總主題數</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              N/A
            </p>
            <p className="text-sm text-gray-600">平均成功率</p>
          </div>
        </div>
      </div>
    </div>
  )
}
