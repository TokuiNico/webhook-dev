/**
 * 訂閱相關的 TypeScript 類型定義
 */

// 訂閱基本資訊
export interface SubscriptionBase {
  subscriber_name: string
  target_url: string
  is_active: boolean
}

// 創建訂閱請求
export interface SubscriptionCreate extends SubscriptionBase {
  topic_id: string
}

// 訂閱響應
export interface SubscriptionResponse {
  id: string
  topic_id: string
  subscriber_name: string
  target_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 訂閱列表響應包裝器
export interface SubscriptionListResponse {
  items: SubscriptionResponse[]
  total: number
  skip: number
  limit: number
}

// 訂閱服務錯誤
export interface SubscriptionError {
  message: string
  code?: string
  field?: string
}

// API 響應包裝器
export interface ApiResponse<T> {
  data?: T
  error?: SubscriptionError
  loading: boolean
}

// 分頁參數
export interface PaginationParams {
  skip?: number
  limit?: number
}

// 訂閱篩選參數
export interface SubscriptionFilterParams extends PaginationParams {
  topic_id?: string
  is_active?: boolean
  subscriber_name?: string
}

// 更新訂閱請求
export interface SubscriptionUpdate {
  subscriber_name?: string
  target_url?: string
  is_active?: boolean
}

// 訂閱統計數據
export interface SubscriptionStats {
  subscription_id: string
  event_count: number
  last_delivery?: string
  success_rate: number
}

// 訂閱詳情響應（包含統計）
export interface SubscriptionDetailResponse extends SubscriptionResponse {
  stats: SubscriptionStats
  recent_deliveries: DeliveryRecord[]
}

// 交付記錄
export interface DeliveryRecord {
  id: string
  event_id: string
  delivered_at: string
  status: 'success' | 'failed' | 'pending'
  response_status?: number
  error_message?: string
}

// 批量操作請求
export interface BulkSubscriptionOperation {
  subscription_ids: string[]
  operation: 'activate' | 'deactivate'
}

// 批量操作響應
export interface BulkOperationResponse {
  success_count: number
  failure_count: number
  results: {
    subscription_id: string
    success: boolean
    error?: string
  }[]
}

// 訂閱表單驗證錯誤
export interface SubscriptionFormErrors {
  topic_id?: string
  subscriber_name?: string
  target_url?: string
  is_active?: string
}
