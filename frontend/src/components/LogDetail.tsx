import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { logService } from '../services/logService'
import type { EventLog, DispatchLog, LogApiResponse } from '../types/log'

interface LogDetailProps {
  /** 日誌類型 */
  logType?: 'event' | 'dispatch'
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 日誌詳情元件
 * 顯示單個事件或派發日誌的完整詳細信息
 */
export const LogDetail = ({ logType, className = '' }: LogDetailProps) => {
  const { logId } = useParams<{ logId: string }>()
  const [eventLog, setEventLog] = useState<EventLog | null>(null)
  const [dispatchLog, setDispatchLog] = useState<DispatchLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 載入日誌詳情
  const loadLogDetail = async () => {
    if (!logId) {
      setError('日誌 ID 無效')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (logType === 'dispatch' || (!logType && logId.startsWith('dispatch'))) {
        const response: LogApiResponse<DispatchLog> = await logService.getDispatchLog(logId)

        if (response.error) {
          setError(response.error.message)
        } else if (response.data) {
          setDispatchLog(response.data)
        }
      } else {
        const response: LogApiResponse<EventLog> = await logService.getEventLog(logId)

        if (response.error) {
          setError(response.error.message)
        } else if (response.data) {
          setEventLog(response.data)
        }
      }
    } catch (err) {
      setError('載入日誌詳情失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入
  useEffect(() => {
    loadLogDetail()
  }, [logId, logType])

  // 格式化 JSON 顯示
  const formatJson = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }

  // 格式化時間顯示
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 獲取狀態顏色
  const getStatusColor = (status: string): string => {
    if (status.includes('SUCCESS')) return 'text-green-600 bg-green-100'
    if (status.includes('FAILED') || status.includes('TIMEOUT')) return 'text-red-600 bg-red-100'
    if (status.includes('PENDING')) return 'text-yellow-600 bg-yellow-100'
    return 'text-blue-600 bg-blue-100'
  }

  // 載入狀態
  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadLogDetail}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  const currentLog = eventLog || dispatchLog
  if (!currentLog) return null

  const isEventLog = !!eventLog

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* 頁面標題 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEventLog ? '事件日誌詳情' : '派發日誌詳情'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              日誌 ID: {currentLog.id}
            </p>
          </div>
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(currentLog.status)}`}>
            {currentLog.status}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>

            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">日誌 ID</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                  {currentLog.id}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">狀態</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(currentLog.status)}`}>
                    {currentLog.status}
                  </span>
                </dd>
              </div>

              {isEventLog ? (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">主題 ID</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                      {eventLog.topic_id}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">來源 IP</dt>
                    <dd className="mt-1 text-sm text-gray-900">{eventLog.source_ip}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">內容類型</dt>
                    <dd className="mt-1 text-sm text-gray-900">{eventLog.content_type}</dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">接收時間</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatTimestamp(eventLog.received_at)}</dd>
                  </div>

                  {eventLog.processed_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">處理時間</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatTimestamp(eventLog.processed_at)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">事件日誌 ID</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                      {dispatchLog.event_log_id}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">訂閱 ID</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                      {dispatchLog.subscription_id}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">嘗試次數</dt>
                    <dd className="mt-1 text-sm text-gray-900">{dispatchLog.attempt}</dd>
                  </div>

                  {dispatchLog.response_status_code && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">響應狀態碼</dt>
                      <dd className="mt-1 text-sm text-gray-900">{dispatchLog.response_status_code}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-sm font-medium text-gray-500">派發時間</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatTimestamp(dispatchLog.dispatched_at)}</dd>
                  </div>

                  {dispatchLog.completed_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">完成時間</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatTimestamp(dispatchLog.completed_at)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {/* 詳細內容 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">詳細內容</h2>

            {isEventLog ? (
              <>
                {/* Headers */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">請求標頭</dt>
                  <dd className="bg-gray-50 p-3 rounded text-sm font-mono text-gray-900 max-h-40 overflow-y-auto">
                    {Object.keys(eventLog.headers).length === 0 ? (
                      <span className="text-gray-500">無標頭信息</span>
                    ) : (
                      Object.entries(eventLog.headers).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="text-blue-600">{key}:</span> {value}
                        </div>
                      ))
                    )}
                  </dd>
                </div>

                {/* Payload */}
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">請求內容</dt>
                  <dd className="bg-gray-50 p-3 rounded text-sm font-mono text-gray-900 max-h-60 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{formatJson(eventLog.payload)}</pre>
                  </dd>
                </div>
              </>
            ) : (
              <>
                {/* Response Body */}
                {dispatchLog?.response_body && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">響應內容</dt>
                    <dd className="bg-gray-50 p-3 rounded text-sm font-mono text-gray-900 max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{formatJson(dispatchLog.response_body)}</pre>
                    </dd>
                  </div>
                )}

                {/* Error Message */}
                {dispatchLog?.error_message && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">錯誤訊息</dt>
                    <dd className="bg-red-50 p-3 rounded text-sm text-red-900 max-h-40 overflow-y-auto">
                      {dispatchLog.error_message}
                    </dd>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
