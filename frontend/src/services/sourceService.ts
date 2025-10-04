/**
 * 來源服務
 * 負責處理來源資源的 CRUD 操作和相關業務邏輯
 */

import axios from 'axios'
import type {
  SourceCreate,
  SourceResponse,
  SourceListResponse,
  SourceUpdate,
  SourceFilterParams,
  SourceStats,
  SourceError,
  ApiResponse
} from '../types/source'
import { authService } from './authService';
import { env } from '../config/env';

class SourceService {
  private readonly baseUrl = env.API_BASE_URL + '/manage/sources'

  /**
   * 獲取來源列表
   * @param filters 篩選參數
   */
  async getSources(filters?: SourceFilterParams): Promise<ApiResponse<SourceResponse[] | SourceListResponse>> {
    try {
      const config: any = {}
      if (filters && Object.keys(filters).length > 0) {
        config.params = filters
      }

      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<SourceListResponse>(`${this.baseUrl}`, {
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
   * 獲取單個來源詳情
   * @param sourceId 來源 ID
   */
  async getSource(sourceId: string): Promise<ApiResponse<SourceResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<SourceResponse>(`${this.baseUrl}/${sourceId}`, {
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
   * 創建新來源
   * @param sourceData 來源創建數據
   */
  async createSource(sourceData: SourceCreate): Promise<ApiResponse<SourceResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.post<SourceResponse>(`${this.baseUrl}`, sourceData, {
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
   * 更新來源
   * @param sourceId 來源 ID
   * @param updateData 更新數據
   */
  async updateSource(sourceId: string, updateData: SourceUpdate): Promise<ApiResponse<SourceResponse>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.put<SourceResponse>(`${this.baseUrl}/${sourceId}`, updateData, {
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
   * 刪除來源
   * @param sourceId 來源 ID
   */
  async deleteSource(sourceId: string): Promise<ApiResponse<void>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      await axios.delete(`${this.baseUrl}/${sourceId}`, {
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
   * 獲取來源統計數據
   */
  async getSourceStats(): Promise<ApiResponse<{ source_statistics: SourceStats[] }>> {
    try {
      const statsUrl = env.API_BASE_URL + '/stats/sources'
      const response = await axios.get<{ source_statistics: SourceStats[] }>(statsUrl)

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
   * 批量刪除來源
   * @param sourceIds 來源 ID 陣列
   */
  async deleteSources(sourceIds: string[]): Promise<ApiResponse<void>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      await axios.delete(this.baseUrl, {
        data: { source_ids: sourceIds },
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
   * 驗證來源名稱可用性
   * @param name 來源名稱
   */
  async checkSourceNameAvailability(name: string): Promise<ApiResponse<{ available: boolean }>> {
    try {
      const response = await axios.get<{ available: boolean }>(`${this.baseUrl}/check-name`, {
        params: { name }
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

    const sourceError: SourceError = {
      message: errorMessage,
      code: errorCode,
      field
    }

    return {
      data: undefined,
      loading: false,
      error: sourceError
    }
  }
}

// 導出單例實例
export const sourceService = new SourceService()
