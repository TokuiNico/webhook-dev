/**
 * 訂閱服務
 * 負責處理訂閱資源的 CRUD 操作和相關業務邏輯
 */

import axios from 'axios'
import type {
  SubscriptionCreate,
  SubscriptionResponse,
  SubscriptionListResponse,
  SubscriptionUpdate,
  SubscriptionFilterParams,
  SubscriptionDetailResponse,
  BulkSubscriptionOperation,
  BulkOperationResponse,
  SubscriptionError,
  ApiResponse
} from '../types/subscription'
import { authService } from './authService'
import { env } from '../config/env'

class SubscriptionService {

  /**
   * 獲取訂閱列表
   * @param filters 篩選參數
   */
  async getSubscriptions(filters?: SubscriptionFilterParams): Promise<ApiResponse<SubscriptionListResponse>> {
    try {
      const config: any = {}
      if (filters && Object.keys(filters).length > 0) {
        config.params = filters
      }

      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<SubscriptionListResponse>(`${env.API_BASE_URL}/subscriptions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: filters
      })

      return {
        data: response.data,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 獲取單個訂閱詳情
   * @param subscriptionId 訂閱 ID
   */
  async getSubscription(subscriptionId: string): Promise<ApiResponse<SubscriptionResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<SubscriptionResponse>(`${env.API_BASE_URL}/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: response.data,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 獲取訂閱詳情（包含統計數據）
   * @param subscriptionId 訂閱 ID
   */
  async getSubscriptionDetail(subscriptionId: string): Promise<ApiResponse<SubscriptionDetailResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<SubscriptionDetailResponse>(`${env.API_BASE_URL}/subscriptions/${subscriptionId}/detail`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: response.data,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 創建新訂閱
   * @param subscriptionData 訂閱創建數據
   */
  async createSubscription(subscriptionData: SubscriptionCreate): Promise<ApiResponse<SubscriptionResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.post<SubscriptionResponse>(`${env.API_BASE_URL}/subscriptions`, subscriptionData, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: response.data,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 更新訂閱
   * @param subscriptionId 訂閱 ID
   * @param updateData 更新數據
   */
  async updateSubscription(subscriptionId: string, updateData: SubscriptionUpdate): Promise<ApiResponse<SubscriptionResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.put<SubscriptionResponse>(`${env.API_BASE_URL}/subscriptions/${subscriptionId}`, updateData, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: response.data,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 停用訂閱
   * @param subscriptionId 訂閱 ID
   */
  async deactivateSubscription(subscriptionId: string): Promise<ApiResponse<void>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      await axios.delete(`${env.API_BASE_URL}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: undefined,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 啟用訂閱
   * @param subscriptionId 訂閱 ID
   */
  async activateSubscription(subscriptionId: string): Promise<ApiResponse<void>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      await axios.post(`${env.API_BASE_URL}/subscriptions/${subscriptionId}/activate`, {}, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: undefined,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 批量操作訂閱
   * @param operation 批量操作請求
   */
  async bulkOperateSubscriptions(operation: BulkSubscriptionOperation): Promise<ApiResponse<BulkOperationResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const endpoint = operation.operation === 'activate' ? 'bulk-activate' : 'bulk-deactivate'

      const response = await axios.post<BulkOperationResponse>(`${env.API_BASE_URL}/subscriptions/${endpoint}`, {
        subscription_ids: operation.subscription_ids
      }, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return {
        data: response.data,
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 處理 API 錯誤，統一錯誤格式
   */
  private handleApiError(error: any): ApiResponse<any> {
    let errorMessage = '未知錯誤'
    let errorCode: string | undefined
    let field: string | undefined

    if (axios.isAxiosError(error)) {
      // HTTP 錯誤
      if (error.response) {
        errorCode = error.response.status.toString()

        if (error.response.data?.detail) {
          // 處理單個錯誤訊息
          if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail
          } else if (Array.isArray(error.response.data.detail)) {
            // 處理驗證錯誤陣列
            errorMessage = error.response.data.detail
            if (error.response.data.detail.length > 0 && error.response.data.detail[0].loc) {
              field = error.response.data.detail[0].loc[1] as string
            }
          }
        } else if (error.response.status === 401) {
          errorMessage = '認證失敗，請重新登入'
        } else if (error.response.status === 403) {
          errorMessage = '權限不足'
        } else if (error.response.status === 404) {
          errorMessage = '訂閱不存在'
        } else if (error.response.status === 409) {
          errorMessage = '訂閱衝突'
        } else if (error.response.status === 422) {
          errorMessage = '請求資料無效'
        } else if (error.response.status >= 500) {
          errorMessage = '服務器錯誤，請稍後再試'
        }
      } else if (error.request) {
        // 網路錯誤
        errorMessage = '網路連線錯誤，請檢查網路設定'
      }
    } else if (error?.response) {
      // 非 axios 錯誤但有響應屬性（測試用）
      errorCode = error.response.status.toString()
      errorMessage = error.response.data?.detail || '未知錯誤'
    } else if (error instanceof Error) {
      // 其他錯誤
      errorMessage = error.message
    }

    const subscriptionError: SubscriptionError = {
      message: errorMessage,
      code: errorCode,
      field
    }

    return {
      data: undefined,
      loading: false,
      error: subscriptionError
    }
  }
}

// 導出單例實例
export const subscriptionService = new SubscriptionService()
