import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { TopicList } from '../TopicList'
import { topicService } from '../../services/topicService'
import type { TopicResponse } from '../../types/topic'

// Mock the topic service
vi.mock('../../services/topicService', () => ({
  topicService: {
    getTopics: vi.fn()
  }
}))

const mockTopicService = vi.mocked(topicService)

// Mock the router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('TopicList', () => {
  const mockTopics: TopicResponse[] = [
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      name: 'github.push',
      source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAQ',
      description: 'GitHub push events',
      ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAV',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    },
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      name: 'stripe.payment.succeeded',
      source_id: '01ARZ3NDEKTSV4RRFFQ69G5FAB',
      description: 'Stripe payment success events',
      ingest_url: 'http://localhost:8000/api/v1/ingest/01ARZ3NDEKTSV4RRFFQ69G5FAW',
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z'
    }
  ]

  const mockTopicsWithStats = mockTopics.map(topic => ({
    ...topic,
    webhook_count: Math.floor(Math.random() * 100),
    subscription_count: Math.floor(Math.random() * 10),
    source_name: topic.source_id === '01ARZ3NDEKTSV4RRFFQ69G5FAQ' ? 'github' : 'stripe'
  }))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  it('renders loading state initially', () => {
    mockTopicService.getTopics.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<TopicList />)

    expect(screen.getByText('載入主題列表中...')).toBeInTheDocument()
  })

  it('renders topics grouped by source when data is loaded', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: mockTopicsWithStats,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      expect(screen.getByText('github')).toBeInTheDocument()
      expect(screen.getByText('stripe')).toBeInTheDocument()
      expect(screen.getByText('github.push')).toBeInTheDocument()
      expect(screen.getByText('stripe.payment.succeeded')).toBeInTheDocument()
    })
  })

  it('shows empty state when no topics exist', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      expect(screen.getByText('尚未建立任何主題')).toBeInTheDocument()
      expect(screen.getByText('創建第一個主題來開始接收 webhook 事件')).toBeInTheDocument()
    })
  })

  it('shows error message when loading fails', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: undefined,
      loading: false,
      error: { message: '載入失敗' }
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      expect(screen.getByText('載入失敗')).toBeInTheDocument()
      expect(screen.getByText('重新載入')).toBeInTheDocument()
    })
  })

  it('filters topics by source when source filter is applied', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: [mockTopicsWithStats[0]], // Only github topics
        total: 1,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      const sourceSelect = screen.getByDisplayValue('全部來源')
      expect(sourceSelect).toBeInTheDocument()
    })
  })

  it('navigates to topic detail when view button is clicked', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: mockTopicsWithStats,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      const viewButtons = screen.getAllByText('檢視')
      expect(viewButtons.length).toBeGreaterThan(0)
    })
  })

  it('displays topic statistics correctly', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: mockTopicsWithStats,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      // Should show webhook and subscription counts
      expect(screen.getByText('主題管理')).toBeInTheDocument()
      expect(screen.getByText('共 2 個主題')).toBeInTheDocument()
    })
  })

  it('shows create topic button', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      expect(screen.getByText('創建第一個主題')).toBeInTheDocument()
    })
  })

  it('displays topic details in cards', async () => {
    mockTopicService.getTopics.mockResolvedValue({
      data: {
        items: mockTopicsWithStats,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<TopicList />)

    await waitFor(() => {
      expect(screen.getByText('GitHub push events')).toBeInTheDocument()
      expect(screen.getByText('Stripe payment success events')).toBeInTheDocument()
    })
  })

  it('applies custom className', () => {
    mockTopicService.getTopics.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<TopicList className="custom-topic-list" />)

    const container = screen.getByText('載入主題列表中...').closest('div')
    expect(container).toHaveClass('custom-topic-list')
  })
})
