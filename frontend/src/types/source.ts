/**
 * 來源相關的 TypeScript 類型定義
 */

// 認證類型枚舉
export type AuthType = 'signature' | 'none'

// 來源基本資訊
export interface SourceBase {
  name: string
  secret: string
  auth_type: AuthType
  auth_config?: Record<string, any>
}

// 創建來源請求
export interface SourceCreate extends SourceBase {}

// 來源響應
export interface SourceResponse {
  id: string
  name: string
  auth_type: AuthType
  auth_config?: Record<string, any>
  created_at: string
  updated_at?: string
}

// 來源列表響應包裝器
export interface SourceListResponse {
  items: SourceResponse[]
  total: number
  skip: number
  limit: number
}

// 來源服務錯誤
export interface SourceError {
  message: string
  code?: string
  field?: string
}

// API 響應包裝器
export interface ApiResponse<T> {
  data?: T
  error?: SourceError
  loading: boolean
}

// 分頁參數
export interface PaginationParams {
  skip?: number
  limit?: number
}

// 來源篩選參數
export interface SourceFilterParams extends PaginationParams {
  name?: string
  auth_type?: AuthType
}

// 來源統計數據
export interface SourceStats {
  source_id: string
  webhook_count: number
  topic_count: number
  last_activity?: string
}

// 更新來源請求
export interface SourceUpdate {
  name?: string
  secret?: string
  auth_type?: AuthType
  auth_config?: Record<string, any>
}

// 來源表單驗證錯誤
export interface SourceFormErrors {
  name?: string
  secret?: string
  auth_type?: string
  auth_config?: string
}
