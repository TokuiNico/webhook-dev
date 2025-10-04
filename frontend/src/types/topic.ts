/**
 * 主題相關的 TypeScript 類型定義
 */

// 主題基本資訊
export interface TopicBase {
  name: string
  description?: string
}

// 創建主題請求
export interface TopicCreate extends TopicBase {
  source_id: string
}

// 更新主題請求
export interface TopicUpdate extends Partial<TopicBase> {}

// 主題響應
export interface TopicResponse extends TopicBase {
  id: string
  source_id: string
  ingest_url: string
  created_at: string
  updated_at: string
}

// 主題列表響應包裝器
export interface TopicListResponse {
  items: TopicResponse[]
  total: number
  skip: number
  limit: number
}

// 主題服務錯誤
export interface TopicError {
  message: string
  code?: string
  field?: string
}

// API 響應包裝器
export interface ApiResponse<T> {
  data?: T
  error?: TopicError
  loading: boolean
}

// 分頁參數
export interface PaginationParams {
  skip?: number
  limit?: number
}

// 主題篩選參數
export interface TopicFilterParams extends PaginationParams {
  source_id?: string
  name?: string
}

// 主題統計數據
export interface TopicStats {
  topic_id: string
  webhook_count: number
  subscription_count: number
  last_activity?: string
  source_name: string
}

// 主題表單驗證錯誤
export interface TopicFormErrors {
  name?: string
  description?: string
  source_id?: string
}
