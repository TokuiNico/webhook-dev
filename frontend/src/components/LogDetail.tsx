import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
  Server,
  FileJson,
  Calendar,
  Globe
} from 'lucide-react'
import { logService } from '../services/logService'
import type { EventLog, DispatchLog, LogApiResponse } from '../types/log'

interface LogDetailProps {
  logType?: 'event' | 'dispatch'
  className?: string
}

export const LogDetail = ({ logType, className = '' }: LogDetailProps) => {
  const { logId } = useParams<{ logId: string }>()
  const [eventLog, setEventLog] = useState<EventLog | null>(null)
  const [dispatchLog, setDispatchLog] = useState<DispatchLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    loadLogDetail()
  }, [logId, logType])

  const formatJson = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }

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

  const getStatusConfig = (status: string) => {
    if (status.includes('SUCCESS')) return { color: 'text-emerald-700 bg-emerald-50', icon: <CheckCircle size={16} /> }
    if (status.includes('FAILED') || status.includes('TIMEOUT')) return { color: 'text-rose-700 bg-rose-50', icon: <XCircle size={16} /> }
    if (status.includes('PENDING')) return { color: 'text-amber-700 bg-amber-50', icon: <Clock size={16} /> }
    return { color: 'text-blue-700 bg-blue-50', icon: <Clock size={16} /> }
  }

  if (loading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-100 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-100 rounded-xl"></div>
            <div className="h-64 bg-slate-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`card p-12 text-center ${className}`}>
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">載入失敗</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={loadLogDetail} className="btn gap-2">
          <RefreshCw size={18} /> 重新載入
        </button>
      </div>
    )
  }

  const currentLog = eventLog || dispatchLog
  if (!currentLog) return null

  const isEventLog = !!eventLog
  const statusConfig = getStatusConfig(currentLog.status)

  return (
    <div className={`card overflow-hidden border border-slate-200 ${className}`}>
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wide ${statusConfig.color}`}>
              {statusConfig.icon}
              {currentLog.status}
            </span>
            <span className="text-slate-400 text-sm font-mono">#{currentLog.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEventLog ? '事件日誌詳情' : '派發日誌詳情'}
          </h1>
        </div>
        <div className="flex flex-col items-end text-right">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            {formatTimestamp(isEventLog ? eventLog.received_at : dispatchLog!.dispatched_at)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isEventLog ? '接收時間' : '派發時間'}
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Meta Information */}
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Hash size={16} /> 基本資訊
            </h3>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
              <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <span className="text-sm font-medium text-slate-600">日誌 ID</span>
                <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 select-all">{currentLog.id}</code>
              </div>

              {isEventLog ? (
                <>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-slate-600">主題 ID</span>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 select-all">{eventLog.topic_id}</code>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-slate-600">來源 IP</span>
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-900">{eventLog.source_ip}</span>
                    </div>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-slate-600">Content-Type</span>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-primary-600">{eventLog.content_type}</code>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-slate-600">事件日誌 ID</span>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 select-all">{dispatchLog!.event_log_id}</code>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-slate-600">訂閱 ID</span>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 select-all">{dispatchLog!.subscription_id}</code>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-medium text-slate-600">嘗試次數</span>
                    <span className="text-sm font-bold text-slate-900 bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                      Attempt #{dispatchLog!.attempt}
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          {isEventLog && eventLog.headers && Object.keys(eventLog.headers).length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Server size={16} /> HTTP Headers
              </h3>
              <div className="bg-slate-900 rounded-xl p-4 overflow-hidden border border-slate-800 shadow-inner">
                <div className="font-mono text-xs space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(eventLog.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-3 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                      <span className="text-primary-400 font-semibold min-w-[120px] shrink-0 text-right">{key}:</span>
                      <span className="text-slate-300 break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!isEventLog && dispatchLog?.response_status_code && (
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe size={16} /> HTTP 響應
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 mb-1">狀態碼</div>
                  <div className="text-3xl font-black text-slate-900 flex items-center gap-2">
                    {dispatchLog.response_status_code}
                    {dispatchLog.response_status_code >= 200 && dispatchLog.response_status_code < 300 && <CheckCircle className="text-emerald-500" size={24} />}
                    {dispatchLog.response_status_code >= 400 && <AlertCircle className="text-rose-500" size={24} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                    {dispatchLog.response_status_code >= 200 && dispatchLog.response_status_code < 300 ? 'SUCCESS' : 'ERROR'}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Payload / Response Body */}
        <div className="space-y-8">
          <section className="h-full flex flex-col">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileJson size={16} /> {isEventLog ? 'Payload 內容' : '響應內容'}
            </h3>

            <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex flex-col">
              <div className="bg-slate-800/50 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-mono text-slate-400">JSON / Text</span>
                <span className="text-xs text-slate-500">{isEventLog ? 'Request Body' : 'Response Body'}</span>
              </div>
              <div className="p-4 overflow-auto custom-scrollbar flex-1 relative group">
                <pre className="font-mono text-sm text-emerald-400 whitespace-pre-wrap break-all">
                  {isEventLog
                    ? formatJson(JSON.stringify(eventLog.payload))
                    : dispatchLog?.response_body
                      ? formatJson(dispatchLog.response_body)
                      : <span className="text-slate-600 italic">// No content</span>
                  }
                </pre>
              </div>
            </div>

            {/* Error Message Section if exists */}
            {(isEventLog ? false : dispatchLog?.error_message) && (
              <div className="mt-6 animate-fade-in">
                <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlertCircle size={16} /> 錯誤訊息
                </h3>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800 font-mono shadow-sm">
                  {dispatchLog!.error_message}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
