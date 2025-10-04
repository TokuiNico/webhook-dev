/**
 * 日誌服務
 * 負責處理事件日誌和派發日誌的查詢、過濾和搜尋功能
 */

import axios from 'axios'
import type {
  EventLog,
  DispatchLog,
  EventLogListResponse,
  DispatchLogListResponse,
  EventLogFilterParams,
  DispatchLogFilterParams,
  UnifiedLogItem,
  UnifiedLogListResponse,
  LogApiResponse
} from '../types/log'
import { authService } from './authService'
import { env } from '../config/env'

class LogService {
  private readonly baseUrl = env.API_BASE_URL + '/logs'

  /**
   * 獲取事件日誌列表
   * @param filters 篩選參數
   */
  async getEventLogs(filters?: EventLogFilterParams): Promise<LogApiResponse<EventLogListResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
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

      const response = await axios.get<EventLogListResponse>(`${this.baseUrl}/events/`, config)

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
   * 獲取單個事件日誌詳情
   * @param eventId 事件日誌 ID
   */
  async getEventLog(eventId: string): Promise<LogApiResponse<EventLog>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<EventLog>(`${this.baseUrl}/events/${eventId}`, {
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
   * 獲取派發日誌列表
   * @param filters 篩選參數
   */
  async getDispatchLogs(filters?: DispatchLogFilterParams): Promise<LogApiResponse<DispatchLogListResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
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

      const response = await axios.get<DispatchLogListResponse>(`${this.baseUrl}/dispatches/`, config)

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
   * 獲取單個派發日誌詳情
   * @param dispatchId 派發日誌 ID
   */
  async getDispatchLog(dispatchId: string): Promise<LogApiResponse<DispatchLog>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<DispatchLog>(`${this.baseUrl}/dispatches/${dispatchId}`, {
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
   * 獲取統一的日誌列表（事件和派發日誌合併）
   * @param filters 篩選參數
   */
  async getUnifiedLogs(filters?: EventLogFilterParams & DispatchLogFilterParams): Promise<LogApiResponse<UnifiedLogListResponse>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      // 並發獲取事件和派發日誌
      const [eventLogsResult, dispatchLogsResult] = await Promise.allSettled([
        this.getEventLogs(filters),
        this.getDispatchLogs(filters)
      ])

      const eventLogs = eventLogsResult.status === 'fulfilled' && eventLogsResult.value.data
        ? eventLogsResult.value.data.items
        : []

      const dispatchLogs = dispatchLogsResult.status === 'fulfilled' && dispatchLogsResult.value.data
        ? dispatchLogsResult.value.data.items
        : []

      // 轉換為統一格式
      const unifiedItems: UnifiedLogItem[] = [
        ...eventLogs.map(event => ({
          id: event.id,
          type: 'event' as const,
          timestamp: event.received_at,
          status: event.status,
          topic_id: event.topic_id,
          source_ip: event.source_ip
        })),
        ...dispatchLogs.map(dispatch => ({
          id: dispatch.id,
          type: 'dispatch' as const,
          timestamp: dispatch.dispatched_at,
          status: dispatch.status,
          subscription_id: dispatch.subscription_id,
          response_status_code: dispatch.response_status_code,
          error_message: dispatch.error_message
        }))
      ]

      // 按時間戳倒序排序
      unifiedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // 應用分頁
      const skip = filters?.skip || 0
      const limit = filters?.limit || 100
      const paginatedItems = unifiedItems.slice(skip, skip + limit)

      return {
        data: {
          items: paginatedItems,
          total: unifiedItems.length,
          skip,
          limit
        },
        loading: false,
        error: undefined
      }
    } catch (error) {
      return this.handleApiError(error)
    }
  }

  /**
   * 搜尋日誌
   * @param params 搜尋參數
   */
  async searchLogs(query: string, filters?: EventLogFilterParams & DispatchLogFilterParams): Promise<LogApiResponse<UnifiedLogListResponse>> {
    try {
      // 先獲取統一日誌
      const unifiedResult = await this.getUnifiedLogs(filters)

      if (!unifiedResult.data) {
        return unifiedResult
      }

      // 過濾包含查詢關鍵字的項目
      const filteredItems = unifiedResult.data.items.filter(item => {
        const searchableText = [
          item.id,
          item.topic_id,
          item.subscription_id,
          item.source_ip,
          item.status,
          item.error_message
        ].filter(Boolean).join(' ').toLowerCase()

        return searchableText.includes(query.toLowerCase())
      })

      return {
        data: {
          items: filteredItems,
          total: filteredItems.length,
          skip: 0,
          limit: filteredItems.length
        },
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
  private handleApiError(error: any): LogApiResponse<any> {
    let errorMessage = '未知錯誤'
    let errorCode: string | undefined

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorCode = error.response.status.toString()
        // 優先檢查 message 字段（後端統一錯誤格式）
        if (error.response.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data?.detail) {
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
        errorMessage = '網路連線錯誤，請檢查網路設定'
      }
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    return {
      data: undefined,
      loading: false,
      error: {
        message: errorMessage,
        code: errorCode
      }
    }
  }
}

// 匯出單例實例
export const logService = new LogService()
