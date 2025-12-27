import { useState, useEffect } from 'react'
import {
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
  Code,
  Loader2,
  FileJson,
  List
} from 'lucide-react'
import { logService } from '../services/logService'
import type {
  EventLogWithDispatchCount,
  EventLogWithDispatches,
  DispatchLog,
  HierarchicalLogListResponse,
  LogApiResponse
} from '../types/log'

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
  const [logs, setLogs] = useState<EventLogWithDispatchCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // 展開狀態：記錄哪些 EventLog 已展開
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  // 展開狀態：記錄哪些 DispatchLog 已展開（顯示 response）
  const [expandedDispatches, setExpandedDispatches] = useState<Set<string>>(new Set())
  // 完整事件資料：記錄每個 EventLog 的完整資料
  const [eventDetailsMap, setEventDetailsMap] = useState<Map<string, EventLogWithDispatches>>(new Map())
  // 載入狀態：記錄哪些 EventLog 的詳細資料正在載入
  const [loadingEventDetails, setLoadingEventDetails] = useState<Set<string>>(new Set())

  const loadLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      const response: LogApiResponse<HierarchicalLogListResponse> =
        await logService.getHierarchicalLogs(filters)

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

  const toggleExpanded = async (eventId: string) => {
    const newExpanded = new Set(expandedEvents)

    if (newExpanded.has(eventId)) {
      // 收合
      newExpanded.delete(eventId)
      setExpandedEvents(newExpanded)
    } else {
      // 展開
      newExpanded.add(eventId)
      setExpandedEvents(newExpanded)

      // 如果還沒有載入過該事件的完整資料，則載入
      if (!eventDetailsMap.has(eventId)) {
        setLoadingEventDetails(prev => new Set(prev).add(eventId))

        try {
          const result = await logService.getEventWithDispatches(eventId)
          if (result.data) {
            setEventDetailsMap(prev => new Map(prev).set(eventId, result.data))
          }
        } catch (error) {
          console.error('載入事件詳細資料失敗:', error)
        } finally {
          setLoadingEventDetails(prev => {
            const newSet = new Set(prev)
            newSet.delete(eventId)
            return newSet
          })
        }
      }
    }
  }

  const toggleDispatchExpanded = (dispatchId: string) => {
    const newExpanded = new Set(expandedDispatches)
    if (newExpanded.has(dispatchId)) {
      newExpanded.delete(dispatchId)
    } else {
      newExpanded.add(dispatchId)
    }
    setExpandedDispatches(newExpanded)
  }

  const formatJson = (jsonString: string | null | undefined): string => {
    if (!jsonString) return '// No data'
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
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
    if (status.includes('PENDING') || status.includes('RETRYING')) return { color: 'text-amber-700 bg-amber-50', icon: <Clock size={14} /> }
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
          <h2 className="text-lg font-bold text-slate-900">階層式日誌</h2>
          <p className="text-sm text-slate-500 font-medium">
            總共 {total} 個事件
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
              <Server size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">沒有日誌記錄</h3>
            <p className="mt-1">目前沒有符合條件的日誌記錄</p>
          </div>
        ) : (
          logs.map((event) => {
            const statusConfig = getStatusConfig(event.status)
            const isExpanded = expandedEvents.has(event.id)
            const isLoadingDetails = loadingEventDetails.has(event.id)
            const eventDetails = eventDetailsMap.get(event.id)
            const dispatches = eventDetails?.dispatches || []

            return (
              <div key={event.id} className="group">
                {/* 母日誌：EventLog */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => toggleExpanded(event.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Server size={20} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {event.status || 'UNKNOWN'}
                        </span>
                        <span className="text-xs font-mono text-slate-400">#{event.id.slice(0, 8)}</span>
                        {event.dispatch_count > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            {event.dispatch_count} 個派發
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="truncate font-medium text-slate-900">
                          接收 Webhook 事件
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          IP: {event.source_ip || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-slate-900 mb-0.5">
                        {getRelativeTime(event.received_at)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(event.received_at).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="text-slate-400 group-hover:text-primary-600 transition-colors">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {/* EventLog 展開區域 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-4">
                    {isLoadingDetails ? (
                      <div className="flex items-center gap-2 text-slate-500 py-4">
                        <Loader2 className="animate-spin" size={16} />
                        <span>載入詳細資料...</span>
                      </div>
                    ) : eventDetails ? (
                      <div className="space-y-4">
                        {/* EventLog 詳細資訊 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Payload */}
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                              <FileJson size={16} />
                              Payload
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 shadow-inner max-h-64 overflow-y-auto">
                              <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap break-words">
                                {formatJson(eventDetails.payload)}
                              </pre>
                            </div>
                          </div>

                          {/* Headers */}
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                              <List size={16} />
                              Headers
                            </div>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 max-h-64 overflow-y-auto">
                              <div className="font-mono text-xs text-slate-600 space-y-1">
                                {eventDetails.headers && Object.entries(eventDetails.headers).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="text-primary-600 font-semibold min-w-[120px] shrink-0">{key}:</span>
                                    <span className="break-all">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* DispatchLog 列表 */}
                        {dispatches.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                              <Globe size={16} />
                              派發記錄 ({dispatches.length})
                            </div>
                            <div className="space-y-2">
                              {dispatches.map((dispatch) => {
                                const dispatchStatus = getStatusConfig(dispatch.status)
                                const isDispatchExpanded = expandedDispatches.has(dispatch.id)

                                return (
                                  <div
                                    key={dispatch.id}
                                    className="bg-white rounded-lg border border-slate-200 overflow-hidden"
                                  >
                                    {/* DispatchLog 摘要（可點擊） */}
                                    <div
                                      className="p-3 cursor-pointer hover:bg-purple-50/50 transition-colors"
                                      onClick={() => toggleDispatchExpanded(dispatch.id)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                          <div className="p-1.5 rounded bg-purple-50 text-purple-600">
                                            <Globe size={16} />
                                          </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold uppercase ${dispatchStatus.color}`}>
                                              {dispatchStatus.icon}
                                              {dispatch.status || 'UNKNOWN'}
                                            </span>
                                            <span className="text-xs font-mono text-slate-400">
                                              #{dispatch.id.slice(0, 8)}
                                            </span>
                                            {dispatch.response_status_code && (
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${dispatch.response_status_code >= 200 && dispatch.response_status_code < 300
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                HTTP {dispatch.response_status_code}
                                              </span>
                                            )}
                                          </div>

                                          <div className="text-xs text-slate-600">
                                            發送到訂閱者 • {new Date(dispatch.dispatched_at).toLocaleString('zh-TW')}
                                          </div>
                                        </div>

                                        <div className="text-slate-400">
                                          {isDispatchExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </div>
                                      </div>

                                      {dispatch.error_message && !isDispatchExpanded && (
                                        <div className="mt-2 text-xs text-rose-600 bg-rose-50 rounded px-2 py-1">
                                          {dispatch.error_message}
                                        </div>
                                      )}
                                    </div>

                                    {/* DispatchLog 詳細資訊（展開後） */}
                                    {isDispatchExpanded && (
                                      <div className="border-t border-slate-100 bg-slate-50 p-3">
                                        <div className="space-y-3">
                                          {/* Response Body */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-700">
                                              <Code size={14} />
                                              Response Body
                                            </div>
                                            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800 shadow-inner max-h-48 overflow-y-auto">
                                              <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap break-words">
                                                {formatJson(dispatch.response_body)}
                                              </pre>
                                            </div>
                                          </div>

                                          {/* Error Message */}
                                          {dispatch.error_message && (
                                            <div>
                                              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-rose-700">
                                                <AlertCircle size={14} />
                                                錯誤訊息
                                              </div>
                                              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-700">
                                                {dispatch.error_message}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {dispatches.length === 0 && (
                          <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg border border-slate-200">
                            此事件沒有派發記錄
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400">無法載入詳細資料</div>
                    )}
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
