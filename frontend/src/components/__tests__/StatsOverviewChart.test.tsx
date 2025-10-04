import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { StatsOverviewChart } from '../StatsOverviewChart'
import { statsService } from '../../services/statsService'
import type { OverviewStats } from '../../types/stats'

// Mock statsService
vi.mock('../../services/statsService', () => ({
  statsService: {
    getOverviewStats: vi.fn()
  }
}))

const mockStatsService = vi.mocked(statsService)

describe('StatsOverviewChart', () => {
  const mockOverviewStats: OverviewStats = {
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
        source_ip: '127.0.0.1',
        status: 'success',
        created_at: '2024-01-01T10:00:00Z',
        processed_at: '2024-01-01T10:00:05Z'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: null,
      loading: true,
      error: undefined
    })

    render(<StatsOverviewChart />)

    expect(screen.getByText('系統統計總覽')).toBeInTheDocument()
    expect(screen.getByText('即時系統運營指標')).toBeInTheDocument()
  })

  it('renders overview stats when loaded', async () => {
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: mockOverviewStats,
      loading: false,
      error: undefined
    })

    render(<StatsOverviewChart />)

    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument() // total_webhooks
      expect(screen.getByText('45')).toBeInTheDocument() // today_webhooks
      expect(screen.getByText('12')).toBeInTheDocument() // active_subscriptions
      expect(screen.getByText('95.0%')).toBeInTheDocument() // success_rate
    })

    expect(screen.getByText('健康')).toBeInTheDocument() // system_health
  })

  it('renders error state when API fails', async () => {
    const errorMessage = 'Failed to load stats'
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: null,
      loading: false,
      error: { message: errorMessage, code: '500' }
    })

    render(<StatsOverviewChart />)

    await waitFor(() => {
      expect(screen.getByText('載入失敗')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('formats numbers correctly', async () => {
    const largeNumbersStats = {
      ...mockOverviewStats,
      total_webhooks: 1500000, // Should format as 1.5M
      today_webhooks: 1500 // Should format as 1.5K
    }

    mockStatsService.getOverviewStats.mockResolvedValue({
      data: largeNumbersStats,
      loading: false,
      error: undefined
    })

    render(<StatsOverviewChart />)

    await waitFor(() => {
      expect(screen.getByText('1.5M')).toBeInTheDocument()
      expect(screen.getByText('1.5K')).toBeInTheDocument()
    })
  })

  it('displays recent events', async () => {
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: mockOverviewStats,
      loading: false,
      error: undefined
    })

    render(<StatsOverviewChart />)

    await waitFor(() => {
      expect(screen.getByText('近期事件')).toBeInTheDocument()
      expect(screen.getByText(/01ARZ3NDEKTSV4RRFFQ69G5FAV/)).toBeInTheDocument()
      expect(screen.getByText('127.0.0.1')).toBeInTheDocument()
    })
  })

  it('shows empty state for recent events when none exist', async () => {
    const emptyStats = {
      ...mockOverviewStats,
      recent_events: []
    }

    mockStatsService.getOverviewStats.mockResolvedValue({
      data: emptyStats,
      loading: false,
      error: undefined
    })

    render(<StatsOverviewChart />)

    await waitFor(() => {
      expect(screen.getByText('暫無近期事件')).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: null,
      loading: true,
      error: undefined
    })

    const { container } = render(<StatsOverviewChart className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows refresh button when autoRefresh is true', async () => {
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: mockOverviewStats,
      loading: false,
      error: undefined
    })

    render(<StatsOverviewChart autoRefresh={true} />)

    await waitFor(() => {
      expect(screen.getByText('刷新')).toBeInTheDocument()
    })
  })

  it('does not show refresh button when autoRefresh is false', async () => {
    mockStatsService.getOverviewStats.mockResolvedValue({
      data: mockOverviewStats,
      loading: false,
      error: undefined
    })

    render(<StatsOverviewChart autoRefresh={false} />)

    await waitFor(() => {
      expect(screen.queryByText('刷新')).not.toBeInTheDocument()
    })
  })
})
