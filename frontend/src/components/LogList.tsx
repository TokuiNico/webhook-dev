import { useState, useEffect } from 'react'
import { logService } from '../services/logService'
import type { UnifiedLogItem, UnifiedLogListResponse, LogApiResponse } from '../types/log'

interface LogListProps {
  /** 自定義 CSS 類名 */
  className?: string
  /** 篩選器 */
  filters?: any
  /** 顯示類型 */
  displayType?: 'events' | 'dispatches' | 'unified'
}

/**
 * 日誌列表元件
 * 顯示事件和派發日誌的統一列表，支持分頁、篩選和搜尋
 */
export const LogList = ({
  className = '',
  filters = {},
  displayType = 'unified'
}: LogListProps) => {
  const [isSearching, setIsSearching] = useState(false)
  const [logs, setLogs] = useState<UnifiedLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())

  // 載入日誌數據
  const loadLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      let response: LogApiResponse<UnifiedLogListResponse>

      // 如果有搜尋查詢，使用搜尋功能
      if (filters.search && filters.search.trim()) {
        setIsSearching(true)
        const searchFilters = { ...filters }
        delete searchFilters.search // 移除 search 字段，因為它不是 API 參數
        response = await logService.searchLogs(filters.search.trim(), searchFilters)
      } else {
        setIsSearching(false)
        if (displayType === 'unified') {
          response = await logService.getUnifiedLogs(filters)
        } else {
          // 這裡可以根據 displayType 調用不同方法
          response = await logService.getUnifiedLogs(filters)
        }
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

  // 處理分頁 - 這個功能暫時移除，因為篩選器現在由父組件控制
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    // 分頁邏輯需要在父組件中處理
    console.log('Page change requested:', newPage)
  }

  // 處理展開/收起
  const toggleExpanded = async (logId: string, log: UnifiedLogItem) => {
    const newExpanded = new Set(expandedItems)
    const itemKey = `${log.type}-${logId}`

    if (newExpanded.has(itemKey)) {
      // 收起
      newExpanded.delete(itemKey)
      setExpandedItems(newExpanded)
    } else {
      // 展開 - 檢查是否需要加載詳細資料
      newExpanded.add(itemKey)
      setExpandedItems(newExpanded)

      // 如果沒有詳細資料，開始加載
      if (!log.detailedData) {
        setLoadingDetails(prev => new Set(prev).add(itemKey))

        try {
          let detailedData
          if (log.type === 'event') {
            const result = await logService.getEventLog(logId)
            if (result.data) {
              detailedData = result.data
            }
          } else {
            const result = await logService.getDispatchLog(logId)
            if (result.data) {
              detailedData = result.data
            }
          }

          if (detailedData) {
            // 更新 logs 狀態，為對應項目添加詳細資料
            setLogs(prevLogs =>
              prevLogs.map(item =>
                item.id === logId && item.type === log.type
                  ? { ...item, detailedData }
                  : item
              )
            )
          }
        } catch (error) {
          console.error('載入詳細資料失敗:', error)
        } finally {
          setLoadingDetails(prev => {
            const newSet = new Set(prev)
            newSet.delete(itemKey)
            return newSet
          })
        }
      }
    }
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

  // 獲取相對時間
  const getRelativeTime = (timestamp: string): string => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}秒前`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分鐘前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小時前`
    return `${Math.floor(diffInSeconds / 86400)}天前`
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
              {isSearching ? '搜尋結果' : (displayType === 'events' ? '事件日誌' : displayType === 'dispatches' ? '派發日誌' : '統一日誌')}
            </h2>
            <p className="text-sm text-gray-600">
              {isSearching ? `找到 ${total} 條匹配記錄` : `總共 ${total} 條記錄`}
            </p>
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
          <div className="p-4 space-y-3">
            {logs.map((log, index) => (
              <div key={`${log.type}-${log.id}`} className={`${
                log.type === 'event'
                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  : 'bg-green-50 border-green-200 hover:bg-green-100'
              } border rounded-lg p-4 hover:shadow-md transition-shadow`}>
                {/* 卡片標題行 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {/* 日誌類型標籤和圖標 */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      log.type === 'event'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {log.type === 'event' ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                          </svg>
                          事件接收
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.409l-7-14z" />
                          </svg>
                          訊息派發
                        </>
                      )}
                    </div>

                    {/* 狀態徽章 */}
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                      {log.status || '未知'}
                    </span>

                    {/* 序列號 */}
                    <span className="text-sm font-semibold text-gray-900">
                      #{String(index + 1).padStart(3, '0')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* 時間顯示 */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900" title={formatTimestamp(log.timestamp)}>
                        {getRelativeTime(log.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.type === 'event' ? '接收' : '派發'}
                      </div>
                    </div>

                    {/* 展開/收起按鈕 */}
                    <button
                      onClick={() => toggleExpanded(log.id, log)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors disabled:opacity-50"
                      disabled={loadingDetails.has(`${log.type}-${log.id}`)}
                      title={expandedItems.has(`${log.type}-${log.id}`) ? '收起詳情' : '展開詳情'}
                    >
                      {loadingDetails.has(`${log.type}-${log.id}`) ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedItems.has(`${log.type}-${log.id}`) ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 主要信息區域 */}
                <div className="space-y-2">
                  {/* 簡潔摘要（總是顯示） */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      {log.topic_id && (
                        <span>主題: <code className="bg-gray-100 px-1 rounded text-xs font-mono">{log.topic_id.slice(-8)}</code></span>
                      )}
                      {log.subscription_id && (
                        <span>訂閱: <code className="bg-gray-100 px-1 rounded text-xs font-mono">{log.subscription_id.slice(-8)}</code></span>
                      )}
                      {log.source_ip && (
                        <span>IP: <code className="bg-gray-100 px-1 rounded text-xs font-mono">{log.source_ip}</code></span>
                      )}
                      {log.type === 'dispatch' && log.response_status_code && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.response_status_code >= 200 && log.response_status_code < 300
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          HTTP {log.response_status_code}
                        </span>
                      )}
                    </div>
                    {log.error_message && (
                      <span className="text-red-600 text-xs">⚠️ 有錯誤</span>
                    )}
                  </div>

                  {/* 展開的詳細信息 */}
                  {expandedItems.has(`${log.type}-${log.id}`) && (
                    <div className="border-t pt-3 mt-3">
                      {loadingDetails.has(`${log.type}-${log.id}`) ? (
                        <div className="flex items-center justify-center py-4">
                          <svg className="animate-spin h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm text-gray-500">載入詳細資料中...</span>
                        </div>
                      ) : log.detailedData ? (
                        <div className="space-y-4">
                          {/* 基本信息 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                基本資訊
                              </h4>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">日誌 ID:</span>
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.id}</code>
                                </div>

                                {log.topic_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">主題 ID:</span>
                                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.topic_id}</code>
                                  </div>
                                )}

                                {log.subscription_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">訂閱 ID:</span>
                                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.subscription_id}</code>
                                  </div>
                                )}

                                {log.source_ip && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">來源 IP:</span>
                                    <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.source_ip}</code>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 時間信息 */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                時間資訊
                              </h4>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">{log.type === 'event' ? '接收時間:' : '派發時間:'}</span>
                                  <span className="text-gray-900">{formatTimestamp(log.timestamp)}</span>
                                </div>

                                {log.type === 'event' && (log.detailedData as any)?.processed_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">處理時間:</span>
                                    <span className="text-gray-900">{formatTimestamp((log.detailedData as any).processed_at)}</span>
                                  </div>
                                )}

                                {log.type === 'dispatch' && (log.detailedData as any)?.completed_at && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">完成時間:</span>
                                    <span className="text-gray-900">{formatTimestamp((log.detailedData as any).completed_at)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 特殊資料區域 */}
                          <div className="space-y-4">
                            {/* Event 專屬資料 */}
                            {log.type === 'event' && log.detailedData && (
                              <>
                                {/* Headers */}
                                {(log.detailedData as any).headers && Object.keys((log.detailedData as any).headers).length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                      </svg>
                                      HTTP Headers
                                    </h4>
                                    <div className="bg-gray-50 rounded p-3 font-mono text-xs max-h-32 overflow-y-auto">
                                      {Object.entries((log.detailedData as any).headers).map(([key, value]) => (
                                        <div key={key} className="flex">
                                          <span className="text-blue-600 font-medium mr-2">{key}:</span>
                                          <span className="text-gray-800 break-all">{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Content Type & Payload */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(log.detailedData as any).content_type && (
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">Content Type</h4>
                                      <code className="bg-gray-100 px-3 py-2 rounded text-sm block">{(log.detailedData as any).content_type}</code>
                                    </div>
                                  )}

                                  {(log.detailedData as any).payload && (
                                    <div className="md:col-span-2">
                                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                        Payload 資料
                                      </h4>
                                      <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                                        {typeof (log.detailedData as any).payload === 'string'
                                          ? (log.detailedData as any).payload
                                          : JSON.stringify((log.detailedData as any).payload, null, 2)
                                        }
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* Dispatch 專屬資料 */}
                            {log.type === 'dispatch' && log.detailedData && (
                              <>
                                {/* Dispatch 特定資訊 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(log.detailedData as any).event_log_id && (
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">來源事件 ID</h4>
                                      <code className="bg-gray-100 px-3 py-2 rounded text-sm block font-mono">{(log.detailedData as any).event_log_id}</code>
                                    </div>
                                  )}

                                  {(log.detailedData as any).attempt !== undefined && (
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900 mb-2">嘗試次數</h4>
                                      <span className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-sm font-medium block text-center">
                                        第 {(log.detailedData as any).attempt} 次嘗試
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* HTTP 響應詳細資料 */}
                                {log.response_status_code && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                      <svg className="w-4 h-4 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      HTTP 響應詳情
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-gray-50 p-3 rounded">
                                        <div className="text-sm text-gray-600 mb-1">狀態碼</div>
                                        <div className="text-lg font-bold text-gray-900">{log.response_status_code}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {log.response_status_code >= 200 && log.response_status_code < 300 ? '✅ 成功' :
                                           log.response_status_code >= 400 && log.response_status_code < 500 ? '❌ 客戶端錯誤' :
                                           log.response_status_code >= 500 ? '🔥 服務器錯誤' : '❓ 其他狀態'}
                                        </div>
                                      </div>

                                      {(log.detailedData as any).response_body && (
                                        <div className="md:col-span-2">
                                          <div className="text-sm text-gray-600 mb-2">響應內容</div>
                                          <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                                            {typeof (log.detailedData as any).response_body === 'string'
                                              ? (log.detailedData as any).response_body
                                              : JSON.stringify((log.detailedData as any).response_body, null, 2)
                                            }
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* 錯誤信息 */}
                            {log.error_message && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                                  <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  錯誤詳情
                                </h4>
                                <div className="bg-red-50 border border-red-200 rounded p-3">
                                  <pre className="text-red-800 text-sm whitespace-pre-wrap break-words">{log.error_message}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          無法載入詳細資料
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
