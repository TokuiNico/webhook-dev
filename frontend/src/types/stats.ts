// 統計數據相關類型定義

// 系統總覽統計
export interface OverviewStats {
  total_webhooks: number
  today_webhooks: number
  week_webhooks: number
  active_subscriptions: number
  success_rate: number
  system_health: 'healthy' | 'warning' | 'error'
  recent_events: RecentEvent[]
}

// 近期事件
export interface RecentEvent {
  id: string
  topic_id: string
  source_id: string
  status: 'success' | 'failed' | 'pending'
  created_at: string
  processed_at?: string
}

// 活動統計數據
export interface ActivityStats {
  daily_trend: DailyStats[]
  hourly_distribution: HourlyStats[]
}

// 每日統計
export interface DailyStats {
  date: string
  total: number
  success: number
  failed: number
}

// 每小時統計
export interface HourlyStats {
  hour: number
  total: number
  success: number
  failed: number
}

// 來源統計數據
export interface SourceStats {
  sources: SourceStatItem[]
  total_sources: number
}

// 來源統計項目
export interface SourceStatItem {
  source_id: string
  source_name: string
  total_webhooks: number
  total_topics: number
  success_rate: number
  last_activity: string
}

// 統計服務錯誤
export interface StatsError {
  message: string
  code?: string
}

// API 響應包裝器
export interface StatsApiResponse<T> {
  data?: T
  error?: StatsError
  loading: boolean
}

// 圖表數據類型
export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

export interface ChartDataset {
  label: string
  data: number[]
  backgroundColor?: string | string[]
  borderColor?: string | string[]
  fill?: boolean
}

// 時間範圍選項
export type TimeRange = '1d' | '7d' | '30d' | '90d'

// 圖表類型
export type ChartType = 'line' | 'bar' | 'doughnut' | 'pie'

// 匯出格式
export type ExportFormat = 'png' | 'jpg' | 'svg' | 'csv' | 'json'
