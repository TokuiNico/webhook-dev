import { useState, useEffect } from 'react'
import { logService } from '../services/logService'
import type { UnifiedLogItem, UnifiedLogListResponse, LogApiResponse } from '../types/log'

interface LogListProps {
  /** 自定義 CSS 類名 */
  className?: string
  /** 初始篩選器 */
  initialFilters?: any
  /** 顯示類型 */
  displayType?: 'events' | 'dispatches' | 'unified'
}

/**
 * 日誌列表元件
 * 顯示事件和派發日誌的統一列表，支持分頁、篩選和搜尋
 */
export const LogList = ({
  className = '',
  initialFilters = {},
  displayType = 'unified'
}: LogListProps) => {
  const [logs, setLogs] = useState<UnifiedLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 篩選條件
  const [filters, setFilters] = useState({
    ...initialFilters,
    skip: 0,
    limit: pageSize
  })

  // 載入日誌數據
  const loadLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      let response: LogApiResponse<UnifiedLogListResponse>

      if (displayType === 'unified') {
        response = await logService.getUnifiedLogs(filters)
      } else {
        // 這裡可以根據 displayType 調用不同方法
        response = await logService.getUnifiedLogs(filters)
      }

      if (response.error) {
        setError(response.error.message)
        setLogs([]) // 確保在錯誤時也設置為空數組
      } else if (response.data && response.data.items) {
        setLogs(response.data.items)
        setTotal(response.data.total || 0)
        setLastUpdate(new Date())
      } else {
        setLogs([]) // 確保即使數據結構不正確也設置為空數組
      }
    } catch (err) {
      setError('載入日誌失敗')
      setLogs([]) // 確保在異常時也設置為空數組
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入和篩選變更時重新載入
  useEffect(() => {
    loadLogs()
  }, [filters])

  // 處理分頁
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters((prev: any) => ({
      ...prev,
      skip: newPage * pageSize
    }))
  }

  // 格式化時間顯示
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 獲取狀態顏色
  const getStatusColor = (status: string | null | undefined): string => {
    if (!status || typeof status !== 'string') return 'text-gray-600 bg-gray-100'

    if (status.includes('SUCCESS')) return 'text-green-600 bg-green-100'
    if (status.includes('FAILED') || status.includes('TIMEOUT')) return 'text-red-600 bg-red-100'
    if (status.includes('PENDING')) return 'text-yellow-600 bg-yellow-100'
    return 'text-blue-600 bg-blue-100'
  }

  // 載入狀態
  if (loading && (!logs || logs.length === 0)) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error && (!logs || logs.length === 0)) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadLogs}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* 頁面標題和統計 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {displayType === 'events' ? '事件日誌' : displayType === 'dispatches' ? '派發日誌' : '統一日誌'}
            </h2>
            <p className="text-sm text-gray-600">總共 {total} 條記錄</p>
          </div>
          <div className="text-sm text-gray-500">
            {lastUpdate && `最後更新: ${lastUpdate.toLocaleTimeString('zh-TW')}`}
          </div>
        </div>
      </div>

      {/* 日誌列表 */}
      <div className="divide-y divide-gray-200">
        {(!logs || logs.length === 0) ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">沒有日誌記錄</h3>
            <p className="mt-2 text-gray-600">目前沒有符合條件的日誌記錄</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={`${log.type}-${log.id}`} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* 日誌類型指示器 */}
                  <div className={`w-2 h-2 rounded-full ${
                    log.type === 'event' ? 'bg-blue-500' : 'bg-green-500'
                  }`} title={log.type === 'event' ? '事件日誌' : '派發日誌'} />

                  {/* 狀態標籤 */}
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                    {log.status || '未知'}
                  </span>

                  {/* 基本信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {log.type === 'event' ? '事件' : '派發'} #{log.id.slice(-8)}
                      </span>
                      {log.topic_id && (
                        <span className="text-xs text-gray-500">
                          主題: {log.topic_id.slice(-8)}
                        </span>
                      )}
                      {log.subscription_id && (
                        <span className="text-xs text-gray-500">
                          訂閱: {log.subscription_id.slice(-8)}
                        </span>
                      )}
                      {log.source_ip && (
                        <span className="text-xs text-gray-500">
                          IP: {log.source_ip}
                        </span>
                      )}
                    </div>

                    {/* 響應狀態碼（派發日誌） */}
                    {log.response_status_code && (
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.response_status_code >= 200 && log.response_status_code < 300
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          HTTP {log.response_status_code}
                        </span>
                      </div>
                    )}

                    {/* 錯誤訊息 */}
                    {log.error_message && (
                      <p className="mt-1 text-xs text-red-600 truncate max-w-md" title={log.error_message}>
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* 時間戳 */}
                <div className="text-right">
                  <div className="text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {log.type === 'event' ? '接收時間' : '派發時間'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 分頁控制 */}
      {total > pageSize && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            顯示第 {(currentPage * pageSize) + 1}-{Math.min((currentPage + 1) * pageSize, total)} 筆，共 {total} 筆
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              上一頁
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={(currentPage + 1) * pageSize >= total}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
