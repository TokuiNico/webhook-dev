import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { statsService } from '../statsService'
import type {
  OverviewStats,
  ActivityStats,
  SourceStats,
  ChartData,
  TimeRange,
  ChartType,
  ExportFormat
} from '../../types/stats'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock axios.isAxiosError
mockedAxios.isAxiosError = vi.fn((error: any) => {
  return error && error.isAxiosError === true
})

// Mock authService
vi.mock('../authService', () => ({
  authService: {
    getCurrentToken: vi.fn(() => 'mock-token')
  }
}))

describe('StatsService', () => {
  beforeEach(() => {
    // 只清除 axios mock，不清除模塊 mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getOverviewStats', () => {
    it('should fetch overview stats successfully', async () => {
      const mockResponse: OverviewStats = {
        total_webhooks: 1250,
        today_webhooks: 45,
        week_webhooks: 320,
        active_subscriptions: 12,
        success_rate: 0.95,
        system_health: 'healthy',
        recent_events: [
          {
            id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
            source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
            status: 'success',
            created_at: '2024-01-01T10:00:00Z',
            processed_at: '2024-01-01T10:00:05Z'
          }
        ]
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await statsService.getOverviewStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stats/overview', {
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        }
      })
      expect(result).toEqual({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should handle API error', async () => {
      // 創建一個類似 axios 錯誤的對象
      const axiosError = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' }
        },
        isAxiosError: true
      }

      mockedAxios.get.mockRejectedValueOnce(axiosError)

      const result = await statsService.getOverviewStats()

      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: {
          message: 'Internal server error',
          code: '500'
        }
      })
    })
  })

  describe('getActivityStats', () => {
    it('should fetch activity stats with default days', async () => {
      const mockResponse: ActivityStats = {
        daily_trend: [
          {
            date: '2024-01-01',
            total: 45,
            success: 42,
            failed: 3
          }
        ],
        hourly_distribution: [
          {
            hour: 10,
            total: 5,
            success: 5,
            failed: 0
          }
        ]
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await statsService.getActivityStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stats/activity', {
        params: { days: 7 },
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        }
      })
      expect(result.data).toEqual(mockResponse)
    })

    it('should fetch activity stats with custom days', async () => {
      const mockResponse: ActivityStats = {
        daily_trend: [],
        hourly_distribution: []
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      await statsService.getActivityStats(30)

      expect(mockedAxios.get).toHaveBeenCalledWith('http://localhost:8000/api/v1/stats/activity', {
        params: { days: 30 },
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        }
      })
    })
  })

  describe('getSourceStats', () => {
    it('should fetch source stats successfully', async () => {
      const mockResponse: SourceStats = {
        sources: [
          {
            source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
            source_name: 'github',
            total_webhooks: 500,
            total_topics: 5,
            success_rate: 0.98,
            last_activity: '2024-01-01T10:00:00Z'
          }
        ],
        total_sources: 1
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse })

      const result = await statsService.getSourceStats()

      expect(result.data).toEqual(mockResponse)
    })
  })

  describe('transformToChartData', () => {
    it('should transform activity stats to line chart data', () => {
      const activityStats: ActivityStats = {
        daily_trend: [
          { date: '2024-01-01', total: 45, success: 42, failed: 3 },
          { date: '2024-01-02', total: 52, success: 50, failed: 2 }
        ],
        hourly_distribution: []
      }

      const chartData = statsService.transformToChartData(activityStats, 'daily_trend', 'line')

      expect(chartData).toEqual({
        labels: ['2024-01-01', '2024-01-02'],
        datasets: [
          {
            label: 'Total',
            data: [45, 52],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true
          },
          {
            label: 'Success',
            data: [42, 50],
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true
          },
          {
            label: 'Failed',
            data: [3, 2],
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true
          }
        ]
      })
    })

    it('should transform source stats to bar chart data', () => {
      const sourceStats: SourceStats = {
        sources: [
          { source_id: '1', source_name: 'github', total_webhooks: 500, total_topics: 5, success_rate: 0.98, last_activity: '2024-01-01T10:00:00Z' },
          { source_id: '2', source_name: 'stripe', total_webhooks: 300, total_topics: 3, success_rate: 0.95, last_activity: '2024-01-02T10:00:00Z' }
        ],
        total_sources: 2
      }

      const chartData = statsService.transformToChartData(sourceStats, 'sources', 'bar')

      expect(chartData.labels).toEqual(['github', 'stripe'])
      expect(chartData.datasets[0].data).toEqual([500, 300])
    })
  })

  describe('exportChart', () => {
    let originalGetContext: any
    let originalToBlob: any

    beforeEach(() => {
      originalGetContext = HTMLCanvasElement.prototype.getContext
      originalToBlob = HTMLCanvasElement.prototype.toBlob
    })

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = originalGetContext
      HTMLCanvasElement.prototype.toBlob = originalToBlob
    })

    it('should export chart as PNG', async () => {
      const chartData: ChartData = {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{ label: 'Data', data: [1, 2, 3] }]
      }

      // Mock canvas context
      const mockCtx = {
        clearRect: vi.fn(),
        fillStyle: '',
        fillRect: vi.fn(),
        font: '',
        textAlign: '',
        fillText: vi.fn()
      }

      HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any

      // Mock toBlob
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        const mockBlob = new Blob(['mock png data'], { type: 'image/png' })
        callback(mockBlob)
      }) as any

      const result = await statsService.exportChart(chartData, 'png')

      expect(result).toBeInstanceOf(Blob)
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600)
    })
  })
})
