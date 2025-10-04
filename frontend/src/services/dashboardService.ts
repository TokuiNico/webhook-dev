/**
 * 儀表板服務
 * 負責整合後端統計數據 API，提供統一的數據獲取介面
 */

import axios from 'axios'
import type {
  SystemOverview,
  ActivityStats,
  SourceStats,
  ApiResponse,
  DashboardError
} from '../types/dashboard'
import { authService } from './authService';
import { env } from '../config/env';

class DashboardService {
  private readonly baseUrl = `${env.API_BASE_URL}/stats`

  /**
   * 獲取系統總覽統計數據
   */
  async getOverviewStats(): Promise<ApiResponse<SystemOverview>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<SystemOverview>(`${this.baseUrl}/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

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
   * 獲取活動統計數據
   * @param days 統計天數，預設 7 天
   */
  async getActivityStats(days: number = 7): Promise<ApiResponse<ActivityStats>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<ActivityStats>(`${this.baseUrl}/activity`, {
        params: { days },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

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
   * 獲取來源統計數據
   */
  async getSourceStats(): Promise<ApiResponse<SourceStats>> {
    try {
      const token = authService.getCurrentToken();
      if (!token) {
        throw new Error('未登入');
      }

      const response = await axios.get<SourceStats>(`${this.baseUrl}/sources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

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
   * 刷新所有統計數據
   * 返回包含所有統計數據的物件，即使某些請求失敗
   */
  async refreshAllStats(): Promise<{
    overview: ApiResponse<SystemOverview>
    activity: ApiResponse<ActivityStats>
    sources: ApiResponse<SourceStats>
  }> {
    const [overview, activity, sources] = await Promise.allSettled([
      this.getOverviewStats(),
      this.getActivityStats(),
      this.getSourceStats()
    ]);

    return {
      overview: overview.status === 'fulfilled' ? overview.value : this.handleApiError(overview.reason),
      activity: activity.status === 'fulfilled' ? activity.value : this.handleApiError(activity.reason),
      sources: sources.status === 'fulfilled' ? sources.value : this.handleApiError(sources.reason)
    }
  }

  /**
   * 處理 API 錯誤，統一錯誤格式
   */
  private handleApiError(error: any): ApiResponse<any> {
    let errorMessage = '未知錯誤'
    let errorCode: string | undefined

    if (axios.isAxiosError(error)) {
      // HTTP 錯誤
      if (error.response) {
        errorCode = error.response.status.toString()
        if (error.response.data?.detail) {
          errorMessage = error.response.data.detail
        } else if (error.response.status === 401) {
          errorMessage = '認證失敗，請重新登入'
        } else if (error.response.status === 403) {
          errorMessage = '權限不足'
        } else if (error.response.status === 404) {
          errorMessage = '資源不存在'
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
      errorMessage = error.response.data?.detail || 'Unauthorized'
    } else if (error instanceof Error) {
      // 其他錯誤
      errorMessage = error.message
    }

    const dashboardError: DashboardError = {
      message: errorMessage,
      code: errorCode
    }

    return {
      data: undefined,
      loading: false,
      error: dashboardError
    }
  }
}

// 導出單例實例
export const dashboardService = new DashboardService();
