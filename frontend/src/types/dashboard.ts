/**
 * 儀表板相關的 TypeScript 類型定義
 */

// 總覽統計數據
export interface SystemOverview {
  total_webhooks: number
  today_webhooks: number
  week_webhooks: number
  active_subscriptions: number
  total_subscriptions: number
  success_rate: number
  recent_events: RecentEvent[]
  system_status: SystemStatus
}

// 最近事件
export interface RecentEvent {
  id: string
  source: string
  topic: string
  status: string
  received_at: string
  content_type: string
}

// 系統狀態
export type SystemStatus = 'healthy' | 'warning' | 'critical'

// 活動統計數據
export interface ActivityStats {
  daily_activity: DailyActivity[]
  hourly_activity: HourlyActivity[]
  period_days: number
}

// 每日活動
export interface DailyActivity {
  date: string
  webhooks: number
}

// 每小時活動
export interface HourlyActivity {
  hour: number
  webhooks: number
}

// 來源統計數據
export interface SourceStats {
  source_statistics: SourceStatistic[]
}

// 來源統計
export interface SourceStatistic {
  source: string
  webhook_count: number
  topic_count: number
}

// 儀表板服務錯誤
export interface DashboardError {
  message: string
  code?: string
}

// API 響應包裝器
export interface ApiResponse<T> {
  data?: T
  error?: DashboardError
  loading: boolean
}
