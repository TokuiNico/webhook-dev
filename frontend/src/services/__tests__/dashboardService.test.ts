import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { dashboardService } from '../dashboardService'
import type { SystemOverview, ActivityStats, SourceStats } from '../../types/dashboard'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock authService
vi.mock('../authService', () => ({
  authService: {
    getCurrentToken: vi.fn().mockReturnValue('mock-token')
  }
}))

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getOverviewStats', () => {
    it('should fetch and return overview statistics', async () => {
      const mockData: SystemOverview = {
        total_webhooks: 1000,
        today_webhooks: 50,
        week_webhooks: 300,
        active_subscriptions: 25,
        total_subscriptions: 30,
        success_rate: 98.5,
        system_status: 'healthy',
        recent_events: [
          {
            id: '1',
            source: 'github',
            topic: 'push',
            status: 'processed',
            received_at: '2024-01-01T10:00:00Z',
            content_type: 'application/json'
          }
        ]
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      const result = await dashboardService.getOverviewStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/stats/overview')
      expect(result).toEqual({
        data: mockData,
        loading: false,
        error: undefined
      })
    })

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Network Error'
      mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage))

      const result = await dashboardService.getOverviewStats()

      expect(result).toEqual({
        data: undefined,
        loading: false,
        error: { message: errorMessage }
      })
    })

    it('should handle HTTP errors with status codes', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { detail: 'Unauthorized' }
        }
      }
      mockedAxios.get.mockRejectedValueOnce(errorResponse)

      const result = await dashboardService.getOverviewStats()

      expect(result.error).toEqual({
        message: 'Unauthorized',
        code: '401'
      })
    })
  })

  describe('getActivityStats', () => {
    it('should fetch activity statistics with default days', async () => {
      const mockData: ActivityStats = {
        daily_activity: [
          { date: '2024-01-01', webhooks: 10 },
          { date: '2024-01-02', webhooks: 15 }
        ],
        hourly_activity: [
          { hour: 9, webhooks: 5 },
          { hour: 10, webhooks: 8 }
        ],
        period_days: 7
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      const result = await dashboardService.getActivityStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/stats/activity', {
        params: { days: 7 }
      })
      expect(result.data).toEqual(mockData)
    })

    it('should fetch activity statistics with custom days', async () => {
      const mockData: ActivityStats = {
        daily_activity: [],
        hourly_activity: [],
        period_days: 30
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      const result = await dashboardService.getActivityStats(30)

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/stats/activity', {
        params: { days: 30 }
      })
      expect(result.data?.period_days).toBe(30)
    })
  })

  describe('getSourceStats', () => {
    it('should fetch source statistics', async () => {
      const mockData: SourceStats = {
        source_statistics: [
          {
            source: 'github',
            webhook_count: 500,
            topic_count: 5
          },
          {
            source: 'stripe',
            webhook_count: 300,
            topic_count: 3
          }
        ]
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      const result = await dashboardService.getSourceStats()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/stats/sources')
      expect(result.data).toEqual(mockData)
    })
  })

  describe('refreshAllStats', () => {
    it('should refresh all statistics', async () => {
      const overviewData: SystemOverview = {
        total_webhooks: 1000,
        today_webhooks: 50,
        week_webhooks: 300,
        active_subscriptions: 25,
        total_subscriptions: 30,
        success_rate: 98.5,
        system_status: 'healthy',
        recent_events: []
      }

      const activityData: ActivityStats = {
        daily_activity: [],
        hourly_activity: [],
        period_days: 7
      }

      const sourceData: SourceStats = {
        source_statistics: []
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: overviewData })
        .mockResolvedValueOnce({ data: activityData })
        .mockResolvedValueOnce({ data: sourceData })

      const result = await dashboardService.refreshAllStats()

      expect(result.overview?.data).toEqual(overviewData)
      expect(result.activity?.data).toEqual(activityData)
      expect(result.sources?.data).toEqual(sourceData)
    })

    it('should handle partial failures in refresh', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: {} }) // overview success
        .mockRejectedValueOnce(new Error('Activity failed')) // activity fails
        .mockResolvedValueOnce({ data: {} }) // sources success

      const result = await dashboardService.refreshAllStats()

      expect(result.overview?.error).toBeUndefined()
      expect(result.activity?.error?.message).toBe('Activity failed')
      expect(result.sources?.error).toBeUndefined()
    })
  })
})
