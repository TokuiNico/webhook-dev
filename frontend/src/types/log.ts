// 日誌相關類型定義

// 事件日誌狀態
export type EventLogStatus = 'RECEIVED' | 'QUEUED' | 'FAILED_VALIDATION'

// 派發日誌狀態
export type DispatchLogStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT'

// 事件日誌
export interface EventLog {
  id: string
  topic_id: string
  source_ip: string
  headers: Record<string, string>
  content_type: string
  payload: string
  status: EventLogStatus
  received_at: string
  processed_at?: string
}

// 派發日誌
export interface DispatchLog {
  id: string
  event_log_id: string
  subscription_id: string
  attempt: number
  status: DispatchLogStatus
  response_status_code?: number
  response_body?: string
  error_message?: string
  dispatched_at: string
  completed_at?: string
}

// 事件日誌列表響應
export interface EventLogListResponse {
  items: EventLog[]
  total: number
  skip: number
  limit: number
}

// 派發日誌列表響應
export interface DispatchLogListResponse {
  items: DispatchLog[]
  total: number
  skip: number
  limit: number
}

// 日誌服務錯誤
export interface LogError {
  message: string
  code?: string
}

// API 響應包裝器
export interface LogApiResponse<T> {
  data?: T
  error?: LogError
  loading: boolean
}

// 日誌篩選參數
export interface EventLogFilterParams {
  topic_id?: string
  status?: EventLogStatus
  source_ip?: string
  date_from?: string
  date_to?: string
  skip?: number
  limit?: number
}

export interface DispatchLogFilterParams {
  event_log_id?: string
  subscription_id?: string
  status?: DispatchLogStatus
  date_from?: string
  date_to?: string
  skip?: number
  limit?: number
}

// 日誌搜尋參數
export interface LogSearchParams {
  query?: string // 關鍵字搜尋
  type?: 'events' | 'dispatches' | 'all'
}

// 綜合日誌項目（用於統一顯示）
export interface UnifiedLogItem {
  id: string
  type: 'event' | 'dispatch'
  timestamp: string
  status: string
  topic_id?: string
  subscription_id?: string
  source_ip?: string
  response_status_code?: number
  error_message?: string
}

// 綜合日誌列表響應
export interface UnifiedLogListResponse {
  items: UnifiedLogItem[]
  total: number
  skip: number
  limit: number
}

// 日誌統計摘要
export interface LogStats {
  total_events: number
  total_dispatches: number
  success_rate: number
  average_response_time: number
  recent_errors: number
  last_updated: string
}
