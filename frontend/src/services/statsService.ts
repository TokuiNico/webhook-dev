/**
 * 統計視覺化服務
 * 負責處理統計數據的獲取、轉換和圖表匯出功能
 */

import axios from 'axios'
import type {
  OverviewStats,
  ActivityStats,
  SourceStats,
  ChartData,
  ChartDataset,
  TimeRange,
  ChartType,
  ExportFormat,
  StatsApiResponse
} from '../types/stats'
import { authService } from './authService'
import { env } from '../config/env'

class StatsService {
  private readonly baseUrl = `${env.API_BASE_URL}/stats`

  /**
   * 獲取系統總覽統計數據
   */
  async getOverviewStats(): Promise<StatsApiResponse<OverviewStats>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<OverviewStats>(`${this.baseUrl}/overview`, {
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
   * 獲取活動統計數據
   * @param days 統計天數，預設 7 天
   */
  async getActivityStats(days: number = 7): Promise<StatsApiResponse<ActivityStats>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<ActivityStats>(`${this.baseUrl}/activity`, {
        params: { days },
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
   * 獲取來源統計數據
   */
  async getSourceStats(): Promise<StatsApiResponse<SourceStats>> {
    try {
      const token = authService.getCurrentToken()
      if (!token) {
        throw new Error('未登入')
      }

      const response = await axios.get<SourceStats>(`${this.baseUrl}/sources`, {
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
   * 將統計數據轉換為圖表數據格式
   * @param data 統計數據
   * @param type 數據類型
   * @param chartType 圖表類型
   */
  transformToChartData(
    data: ActivityStats | SourceStats,
    type: 'daily_trend' | 'hourly_distribution' | 'sources',
    chartType: ChartType = 'line'
  ): ChartData {
    if (type === 'daily_trend' && 'daily_trend' in data) {
      const dailyData = data as ActivityStats
      return {
        labels: dailyData.daily_trend.map(item => item.date),
        datasets: [
          {
            label: 'Total',
            data: dailyData.daily_trend.map(item => item.total),
            borderColor: '#3B82F6',
            backgroundColor: chartType === 'bar' ? '#3B82F6' : 'rgba(59, 130, 246, 0.1)',
            fill: chartType !== 'bar'
          },
          {
            label: 'Success',
            data: dailyData.daily_trend.map(item => item.success),
            borderColor: '#10B981',
            backgroundColor: chartType === 'bar' ? '#10B981' : 'rgba(16, 185, 129, 0.1)',
            fill: chartType !== 'bar'
          },
          {
            label: 'Failed',
            data: dailyData.daily_trend.map(item => item.failed),
            borderColor: '#EF4444',
            backgroundColor: chartType === 'bar' ? '#EF4444' : 'rgba(239, 68, 68, 0.1)',
            fill: chartType !== 'bar'
          }
        ]
      }
    }

    if (type === 'sources' && 'sources' in data) {
      const sourceData = data as SourceStats
      return {
        labels: sourceData.sources.map(item => item.source_name),
        datasets: [
          {
            label: 'Total Webhooks',
            data: sourceData.sources.map(item => item.total_webhooks),
            backgroundColor: [
              '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
              '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
            ],
            borderColor: [
              '#2563EB', '#059669', '#D97706', '#DC2626',
              '#7C3AED', '#0891B2', '#65A30D', '#EA580C'
            ],
            fill: false
          }
        ]
      }
    }

    return { labels: [], datasets: [] }
  }

  /**
   * 匯出圖表為指定格式
   * @param chartData 圖表數據
   * @param format 匯出格式
   */
  async exportChart(chartData: ChartData, format: ExportFormat): Promise<Blob> {
    return new Promise((resolve) => {
      // 創建臨時 canvas 元素來繪製圖表
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('無法創建 canvas 上下文')
      }

      // 設定 canvas 尺寸
      canvas.width = 800
      canvas.height = 600

      // 繪製簡單的圖表（實際實作中應該使用 Chart.js 或類似庫）
      this.drawSimpleChart(ctx, chartData, canvas.width, canvas.height)

      // 根據格式匯出
      if (format === 'png' || format === 'jpg') {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            throw new Error('匯出圖表失敗')
          }
        }, `image/${format}`)
      } else {
        // 對於其他格式，返回 JSON
        const jsonData = JSON.stringify(chartData, null, 2)
        resolve(new Blob([jsonData], { type: 'application/json' }))
      }
    })
  }

  /**
   * 繪製簡單的圖表（臨時實作，實際應該使用專業圖表庫）
   */
  private drawSimpleChart(
    ctx: CanvasRenderingContext2D,
    chartData: ChartData,
    width: number,
    height: number
  ): void {
    // 清除 canvas
    ctx.clearRect(0, 0, width, height)

    // 設定背景
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    // 如果沒有數據，顯示提示
    if (!chartData.labels.length || !chartData.datasets.length) {
      ctx.fillStyle = '#666666'
      ctx.font = '16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('No data available', width / 2, height / 2)
      return
    }

    // 繪製標題
    ctx.fillStyle = '#333333'
    ctx.font = '18px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Chart Export', width / 2, 30)

    // 簡單的長條圖實作
    const data = chartData.datasets[0].data
    const labels = chartData.labels
    const barWidth = (width - 100) / data.length
    const maxValue = Math.max(...data)

    ctx.textAlign = 'center'
    for (let i = 0; i < data.length; i++) {
      const barHeight = (data[i] / maxValue) * (height - 150)
      const x = 50 + i * barWidth
      const y = height - 80 - barHeight

      // 繪製長條
      ctx.fillStyle = '#3B82F6'
      ctx.fillRect(x, y, barWidth - 10, barHeight)

      // 繪製標籤
      ctx.fillStyle = '#666666'
      ctx.font = '12px Arial'
      ctx.fillText(labels[i], x + (barWidth - 10) / 2, height - 60)

      // 繪製數值
      ctx.fillText(data[i].toString(), x + (barWidth - 10) / 2, y - 10)
    }
  }

  /**
   * 處理 API 錯誤，統一錯誤格式
   */
  private handleApiError(error: any): StatsApiResponse<any> {
    let errorMessage = '未知錯誤'
    let errorCode: string | undefined

    if (axios.isAxiosError(error)) {
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
export const statsService = new StatsService()
