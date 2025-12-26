import { useState, useEffect } from 'react'
import {
  Search,
  ChevronRight,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Globe,
  Server,
  Code
} from 'lucide-react'
import { logService } from '../services/logService'
import type { UnifiedLogItem, UnifiedLogListResponse, LogApiResponse } from '../types/log'

interface LogListProps {
  className?: string
  filters?: any
  displayType?: 'events' | 'dispatches' | 'unified'
}

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

  const loadLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      let response: LogApiResponse<UnifiedLogListResponse>

      if (filters.search && filters.search.trim()) {
        setIsSearching(true)
        const searchFilters = { ...filters }
        delete searchFilters.search
        response = await logService.searchLogs(filters.search.trim(), searchFilters)
      } else {
        setIsSearching(false)
        response = await logService.getUnifiedLogs(filters)
      }

      if (response.error) {
        setError(response.error.message)
        setLogs([])
      } else if (response.data && response.data.items) {
        setLogs(response.data.items)
        setTotal(response.data.total || 0)
        setLastUpdate(new Date())
      } else {
        setLogs([])
      }
    } catch (err) {
      setError('載入日誌失敗')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [filters])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    console.log('Page change requested:', newPage)
  }

  const toggleExpanded = async (logId: string, log: UnifiedLogItem) => {
    const newExpanded = new Set(expandedItems)
    const itemKey = `${log.type}-${logId}`

    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey)
      setExpandedItems(newExpanded)
    } else {
      newExpanded.add(itemKey)
      setExpandedItems(newExpanded)

      if (!log.detailedData) {
        setLoadingDetails(prev => new Set(prev).add(itemKey))

        try {
          let detailedData
          if (log.type === 'event') {
            const result = await logService.getEventLog(logId)
            if (result.data) detailedData = result.data
          } else {
            const result = await logService.getDispatchLog(logId)
            if (result.data) detailedData = result.data
          }

          if (detailedData) {
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

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}秒前`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分鐘前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小時前`
    return `${Math.floor(diffInSeconds / 86400)}天前`
  }

  const getStatusConfig = (status: string | null | undefined) => {
    if (!status || typeof status !== 'string') return { color: 'text-slate-600 bg-slate-100', icon: <AlertCircle size={14} /> }
    if (status.includes('SUCCESS')) return { color: 'text-emerald-700 bg-emerald-50', icon: <CheckCircle size={14} /> }
    if (status.includes('FAILED') || status.includes('TIMEOUT')) return { color: 'text-rose-700 bg-rose-50', icon: <XCircle size={14} /> }
    if (status.includes('PENDING')) return { color: 'text-amber-700 bg-amber-50', icon: <Clock size={14} /> }
    return { color: 'text-blue-700 bg-blue-50', icon: <Clock size={14} /> }
  }

  if (loading && (!logs || logs.length === 0)) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/4 bg-slate-100 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error && (!logs || logs.length === 0)) {
    return (
      <div className={`card p-12 text-center ${className}`}>
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">載入失敗</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={loadLogs} className="btn gap-2">
          <RefreshCw size={18} /> 重新載入
        </button>
      </div>
    )
  }

  return (
    <div className={`card overflow-hidden border border-slate-200 ${className}`}>
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isSearching ? '搜尋結果' : (displayType === 'events' ? '事件日誌' : displayType === 'dispatches' ? '派發日誌' : '統一日誌')}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {isSearching ? `找到 ${total} 條匹配記錄` : `總共 ${total} 條記錄`}
          </p>
        </div>
        {lastUpdate && (
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock size={12} />
            {lastUpdate.toLocaleTimeString('zh-TW')} 更新
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {(!logs || logs.length === 0) ? (
          <div className="p-16 text-center text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">沒有日誌記錄</h3>
            <p className="mt-1">目前沒有符合條件的日誌記錄</p>
          </div>
        ) : (
          logs.map((log) => {
            const statusConfig = getStatusConfig(log.status)
            const isExpanded = expandedItems.has(`${log.type}-${log.id}`)
            const isLoading = loadingDetails.has(`${log.type}-${log.id}`)

            return (
              <div key={`${log.type}-${log.id}`} className="group hover:bg-slate-50/80 transition-colors">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpanded(log.id, log)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <div className={`p-2 rounded-lg ${log.type === 'event' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {log.type === 'event' ? <Server size={20} /> : <Globe size={20} />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {log.status || 'UNKNOWN'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">#{log.id.slice(0, 8)}</span>
                        {log.type === 'dispatch' && log.response_status_code && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.response_status_code >= 200 && log.response_status_code < 300
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                            }`}>
                            HTTP {log.response_status_code}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="truncate font-medium text-slate-900">
                          {log.type === 'event' ? '接收 Webhook 事件' : '發送 Webhook 通知'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          {log.type === 'event' ? `IP: ${log.source_ip || 'N/A'}` : `Attempt: ${(log as any).attempt || 1}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-slate-900 mb-0.5">
                        {getRelativeTime(log.timestamp)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="text-slate-400 group-hover:text-primary-600 transition-colors">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-4 pl-[4.5rem]">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-slate-500 py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                        <span>載入詳細資料...</span>
                      </div>
                    ) : (log.detailedData ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">基本資訊</h4>
                          <div className="space-y-2">
                            {(log.detailedData as any).headers && (
                              <div className="bg-white rounded border border-slate-200 p-3">
                                <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-700">
                                  <Code size={14} /> Headers
                                </div>
                                <div className="font-mono text-xs text-slate-600 max-h-32 overflow-y-auto space-y-1">
                                  {Object.entries((log.detailedData as any).headers).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                      <span className="text-primary-600 font-semibold min-w-[100px] shrink-0">{k}:</span>
                                      <span className="break-all">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {log.error_message && (
                              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-sm text-rose-700">
                                <div className="font-bold flex items-center gap-2 mb-1">
                                  <AlertCircle size={16} /> 錯誤訊息
                                </div>
                                {log.error_message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payload / Response</h4>
                          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto border border-slate-800 shadow-inner">
                            <pre>
                              {log.type === 'event'
                                ? JSON.stringify((log.detailedData as any).payload, null, 2)
                                : (typeof (log.detailedData as any).response_body === 'string'
                                  ? (log.detailedData as any).response_body
                                  : JSON.stringify((log.detailedData as any).response_body, null, 2)) || '// No response body'
                              }
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400">無法載入詳細資料</div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {total > pageSize && (
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm text-slate-500">
            顯示 {(currentPage * pageSize) + 1} - {Math.min((currentPage + 1) * pageSize, total)}，共 {total} 筆
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="btn-secondary h-8 px-3 text-xs"
            >
              <ArrowLeft size={14} className="mr-1" /> 上一頁
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={(currentPage + 1) * pageSize >= total}
              className="btn-secondary h-8 px-3 text-xs"
            >
              下一頁 <ArrowRight size={14} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
