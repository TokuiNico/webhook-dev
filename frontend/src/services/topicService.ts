/**
 * 主題服務
 * 負責處理主題資源的 CRUD 操作和相關業務邏輯
 */

import axios from 'axios'
import type {
  TopicCreate,
  TopicResponse,
  TopicListResponse,
  TopicUpdate,
  TopicFilterParams,
  TopicStats,
  TopicError,
  ApiResponse,
  WebhookTestRequest,
  WebhookTestResponse
} from '../types/topic'
import { authService } from './authService';
import { env } from '../config/env';

class TopicService {
  private readonly baseUrl = env.API_BASE_URL + '/manage/topics'

  /**
   * 獲取主題列表
   * @param filters 篩選參數
   */
  async getTopics(filters?: TopicFilterParams): Promise<ApiResponse<TopicResponse[] | TopicListResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const config: any = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
      if (filters && Object.keys(filters).length > 0) {
        config.params = filters
      }

      const response = await axios.get<TopicListResponse>(this.baseUrl, config)

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
   * 獲取單個主題詳情
   * @param topicId 主題 ID
   */
  async getTopic(topicId: string): Promise<ApiResponse<TopicResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<TopicResponse>(`${this.baseUrl}/${topicId}`, {
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
   * 創建新主題
   * @param topicData 主題創建數據
   */
  async createTopic(topicData: TopicCreate): Promise<ApiResponse<TopicResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.post<TopicResponse>(this.baseUrl, topicData, {
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
   * 更新主題
   * @param topicId 主題 ID
   * @param updateData 更新數據
   */
  async updateTopic(topicId: string, updateData: TopicUpdate): Promise<ApiResponse<TopicResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.put<TopicResponse>(`${this.baseUrl}/${topicId}`, updateData, {
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
   * 刪除主題
   * @param topicId 主題 ID
   */
  async deleteTopic(topicId: string): Promise<ApiResponse<void>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      await axios.delete(`${this.baseUrl}/${topicId}`, {
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
   * 獲取主題統計數據
   */
  async getTopicStats(): Promise<ApiResponse<{ topic_statistics: TopicStats[] }>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<{ topic_statistics: TopicStats[] }>('/api/v1/stats/topics', {
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
   * 批量刪除主題
   * @param topicIds 主題 ID 陣列
   */
  async deleteTopics(topicIds: string[]): Promise<ApiResponse<void>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      await axios.delete(this.baseUrl, {
        data: { topic_ids: topicIds },
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
   * 驗證主題名稱可用性
   * @param name 主題名稱
   * @param sourceId 來源 ID
   */
  async checkTopicNameAvailability(name: string, sourceId: string): Promise<ApiResponse<{ available: boolean }>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<{ available: boolean }>(`${this.baseUrl}/check-name`, {
        params: { name, source_id: sourceId },
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
   * 獲取主題的 webhook 列表
   */
  async getTopicWebhooks(topicId: string, params?: { skip?: number; limit?: number }): Promise<ApiResponse<any>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<any>(`${this.baseUrl}/${topicId}/webhooks`, {
        params,
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
   * 獲取主題的訂閱者列表
   */
  async getTopicSubscribers(topicId: string, params?: { skip?: number; limit?: number }): Promise<ApiResponse<any>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<any>(`${this.baseUrl}/${topicId}/subscribers`, {
        params,
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
   * 測試 webhook 接收功能
   * @param topicId 主題 ID
   * @param testRequest 測試請求數據
   */
  async testWebhook(topicId: string, testRequest: WebhookTestRequest): Promise<ApiResponse<WebhookTestResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.post<WebhookTestResponse>(
        `${this.baseUrl}/${topicId}/test`,
        testRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

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

        // 優先檢查 message 字段（後端統一錯誤格式）
        if (error.response.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data?.detail) {
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
          errorMessage = '資源不存在'
        } else if (error.response.status === 409) {
          errorMessage = '資源衝突'
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
      errorMessage = error.response.data?.message || error.response.data?.detail || '未知錯誤'
    } else if (error instanceof Error) {
      // 其他錯誤
      errorMessage = error.message
    }

    const topicError: TopicError = {
      message: errorMessage,
      code: errorCode,
      field
    }

    return {
      data: undefined,
      loading: false,
      error: topicError
    }
  }
}

// 導出單例實例
export const topicService = new TopicService()
