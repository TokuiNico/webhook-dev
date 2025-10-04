import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ActivityChart } from '../ActivityChart'
import { statsService } from '../../services/statsService'
import type { ActivityStats } from '../../types/stats'

// Mock statsService
vi.mock('../../services/statsService', () => ({
  statsService: {
    getActivityStats: vi.fn(),
    transformToChartData: vi.fn(),
    exportChart: vi.fn()
  }
}))

const mockStatsService = vi.mocked(statsService)

describe('ActivityChart', () => {
  const mockActivityStats: ActivityStats = {
    daily_trend: [
      { date: '2024-01-01', total: 45, success: 42, failed: 3 },
      { date: '2024-01-02', total: 52, success: 50, failed: 2 }
    ],
    hourly_distribution: [
      { hour: 10, total: 5, success: 5, failed: 0 },
      { hour: 11, total: 8, success: 7, failed: 1 }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.log to avoid console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders loading state initially', () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: null,
      loading: true,
      error: undefined
    })

    render(<ActivityChart />)

    // Loading state shows skeleton, not text
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })

  it('renders activity stats when loaded', async () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: mockActivityStats,
      loading: false,
      error: undefined
    })

    render(<ActivityChart />)

    await waitFor(() => {
      expect(screen.getByText('總活動量')).toBeInTheDocument()
      expect(screen.getByText('97')).toBeInTheDocument() // 45 + 52
      expect(screen.getByText('平均成功率')).toBeInTheDocument()
      expect(screen.getByText('平均失敗率')).toBeInTheDocument()
    })
  })

  it('renders error state when API fails', async () => {
    const errorMessage = 'Failed to load activity stats'
    mockStatsService.getActivityStats.mockResolvedValue({
      data: null,
      loading: false,
      error: { message: errorMessage, code: '500' }
    })

    render(<ActivityChart />)

    await waitFor(() => {
      expect(screen.getByText('載入失敗')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  it('changes time range when select changes', async () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: mockActivityStats,
      loading: false,
      error: undefined
    })

    render(<ActivityChart showControls={true} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('7 天')).toBeInTheDocument()
    })

    const select = screen.getByDisplayValue('7 天')
    fireEvent.change(select, { target: { value: '30d' } })

    expect(mockStatsService.getActivityStats).toHaveBeenCalledWith(30)
  })

  it('exports chart as PNG when export button is clicked', async () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: mockActivityStats,
      loading: false,
      error: undefined
    })
    mockStatsService.exportChart.mockResolvedValue(new Blob())

    render(<ActivityChart showControls={true} />)

    await waitFor(() => {
      expect(screen.getByText('匯出:')).toBeInTheDocument()
    })

    const pngButton = screen.getByTitle('匯出為 PNG')
    fireEvent.click(pngButton)

    await waitFor(() => {
      expect(mockStatsService.exportChart).toHaveBeenCalledWith(
        expect.any(Object), // chartData
        'png'
      )
    })
  })

  it('exports chart as CSV when export button is clicked', async () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: mockActivityStats,
      loading: false,
      error: undefined
    })

    render(<ActivityChart showControls={true} />)

    await waitFor(() => {
      expect(screen.getByText('匯出:')).toBeInTheDocument()
    })

    const csvButton = screen.getByTitle('匯出為 CSV')
    fireEvent.click(csvButton)

    expect(mockStatsService.transformToChartData).toHaveBeenCalled()
  })

  it('calculates correct statistics', async () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: mockActivityStats,
      loading: false,
      error: undefined
    })

    render(<ActivityChart />)

    await waitFor(() => {
      // Total: 45 + 52 = 97
      expect(screen.getByText('97')).toBeInTheDocument()

      // Success rate: (42/45 + 50/52) / 2 * 100 ≈ 94.7%
      expect(screen.getByText('94.7%')).toBeInTheDocument()

      // Failure rate: (3/45 + 2/52) / 2 * 100 ≈ 5.3%
      expect(screen.getByText('5.3%')).toBeInTheDocument()
    })
  })

  it('applies custom height', () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: null,
      loading: true,
      error: undefined
    })

    const { container } = render(<ActivityChart height={600} />)

    // The chart placeholder div should have the custom height
    const chartDiv = container.querySelector('[style*="height: 600px"]')
    expect(chartDiv).toBeInTheDocument()
  })

  it('hides controls when showControls is false', async () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: mockActivityStats,
      loading: false,
      error: undefined
    })

    render(<ActivityChart showControls={false} />)

    await waitFor(() => {
      expect(screen.queryByText('時間範圍:')).not.toBeInTheDocument()
      expect(screen.queryByText('匯出:')).not.toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    mockStatsService.getActivityStats.mockResolvedValue({
      data: null,
      loading: true,
      error: undefined
    })

    const { container } = render(<ActivityChart className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles empty data gracefully', async () => {
    const emptyStats: ActivityStats = {
      daily_trend: [],
      hourly_distribution: []
    }

    mockStatsService.getActivityStats.mockResolvedValue({
      data: emptyStats,
      loading: false,
      error: undefined
    })

    render(<ActivityChart />)

    await waitFor(() => {
      expect(screen.getByText('總活動量')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument() // Total should be 0
    })
  })
})
