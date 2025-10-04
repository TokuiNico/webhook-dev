import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { SubscriptionList } from '../SubscriptionList'
import { subscriptionService } from '../../services/subscriptionService'
import type { SubscriptionResponse, SubscriptionListResponse } from '../../types/subscription'

// Mock the subscription service
vi.mock('../../services/subscriptionService', () => ({
  subscriptionService: {
    getSubscriptions: vi.fn(),
    deactivateSubscription: vi.fn(),
    activateSubscription: vi.fn(),
    bulkOperateSubscriptions: vi.fn()
  }
}))

const mockSubscriptionService = vi.mocked(subscriptionService)

// Mock the router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock window.confirm and alert
const mockConfirm = vi.fn()
const mockAlert = vi.fn()
Object.defineProperty(window, 'confirm', { value: mockConfirm, writable: true })
Object.defineProperty(window, 'alert', { value: mockAlert, writable: true })

describe('SubscriptionList', () => {
  const mockSubscriptions: SubscriptionResponse[] = [
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      subscriber_name: 'my-service',
      target_url: 'https://api.example.com/webhook',
      is_active: true,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    },
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAX',
      topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAY',
      subscriber_name: 'notification-service',
      target_url: 'https://notify.example.com/webhook',
      is_active: false,
      created_at: '2024-01-02T10:00:00Z',
      updated_at: '2024-01-02T10:00:00Z'
    }
  ]

  const mockResponse: SubscriptionListResponse = {
    items: mockSubscriptions,
    total: 2,
    skip: 0,
    limit: 10
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
    mockAlert.mockClear()
  })

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: undefined,
        loading: true,
        error: undefined
      })

      renderWithProviders(<SubscriptionList />)

      expect(screen.getByText('載入訂閱列表中...')).toBeInTheDocument()
    })

    it('should render error state when API fails', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: undefined,
        loading: false,
        error: { message: '載入失敗', code: '500' }
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
      })
    })

    it('should render subscriptions list successfully', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: mockResponse,
        loading: false,
        error: undefined
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
        expect(screen.getByText('notification-service')).toBeInTheDocument()
      })

      expect(screen.getByText('共 2 個訂閱')).toBeInTheDocument()
    })

    it('should render empty state when no subscriptions', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: { items: [], total: 0, skip: 0, limit: 10 },
        loading: false,
        error: undefined
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('尚未建立任何訂閱')).toBeInTheDocument()
        expect(screen.getByText('創建第一個訂閱')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    beforeEach(() => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should filter by subscriber name', async () => {
      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜尋訂閱者名稱...')
      fireEvent.change(searchInput, { target: { value: 'my-service' } })

      await waitFor(() => {
        expect(mockSubscriptionService.getSubscriptions).toHaveBeenCalledWith(
          expect.objectContaining({ subscriber_name: 'my-service' })
        )
      })
    })

    it('should filter by topic ID', async () => {
      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const topicInput = screen.getByPlaceholderText('輸入主題 ID...')
      fireEvent.change(topicInput, { target: { value: '01ARZ3NDEKTSV4RRFFQ69G5FAW' } })

      await waitFor(() => {
        expect(mockSubscriptionService.getSubscriptions).toHaveBeenCalledWith(
          expect.objectContaining({ topic_id: '01ARZ3NDEKTSV4RRFFQ69G5FAW' })
        )
      })
    })

    it('should filter by active status', async () => {
      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const statusSelect = screen.getByDisplayValue('全部')
      fireEvent.change(statusSelect, { target: { value: 'true' } })

      await waitFor(() => {
        expect(mockSubscriptionService.getSubscriptions).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: true })
        )
      })
    })
  })

  describe('Actions', () => {
    beforeEach(() => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: mockResponse,
        loading: false,
        error: undefined
      })
    })

    it('should navigate to create page when clicking create button', async () => {
      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const createButton = screen.getByText('新增訂閱')
      fireEvent.click(createButton)

      expect(mockNavigate).toHaveBeenCalledWith('/subscriptions/create')
    })

    it('should navigate to detail page when clicking view button', async () => {
      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const viewButtons = screen.getAllByText('檢視')
      fireEvent.click(viewButtons[0])

      expect(mockNavigate).toHaveBeenCalledWith('/subscriptions/01ARZ3NDEKTSV4RRFFQ69G5FAV')
    })

    it('should navigate to edit page when clicking edit button', async () => {
      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('編輯')
      fireEvent.click(editButtons[0])

      expect(mockNavigate).toHaveBeenCalledWith('/subscriptions/01ARZ3NDEKTSV4RRFFQ69G5FAV/edit')
    })

    it('should deactivate active subscription', async () => {
      mockSubscriptionService.deactivateSubscription.mockResolvedValue({
        data: undefined,
        loading: false,
        error: undefined
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const deactivateButtons = screen.getAllByText('停用')
      fireEvent.click(deactivateButtons[0])

      expect(mockConfirm).toHaveBeenCalledWith('確定要停用訂閱 "my-service" 嗎？訂閱將停止接收 webhook 事件。')

      await waitFor(() => {
        expect(mockSubscriptionService.deactivateSubscription).toHaveBeenCalledWith('01ARZ3NDEKTSV4RRFFQ69G5FAV')
        expect(mockAlert).toHaveBeenCalledWith('訂閱停用成功')
      })
    })

    it('should activate inactive subscription', async () => {
      mockSubscriptionService.activateSubscription.mockResolvedValue({
        data: undefined,
        loading: false,
        error: undefined
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('notification-service')).toBeInTheDocument()
      })

      const activateButtons = screen.getAllByText('啟用')
      fireEvent.click(activateButtons[0])

      await waitFor(() => {
        expect(mockSubscriptionService.activateSubscription).toHaveBeenCalledWith('01ARZ3NDEKTSV4RRFFQ69G5FAX')
        expect(mockAlert).toHaveBeenCalledWith('訂閱啟用成功')
      })
    })

    it('should handle deactivation error', async () => {
      mockSubscriptionService.deactivateSubscription.mockResolvedValue({
        data: undefined,
        loading: false,
        error: { message: '停用失敗' }
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const deactivateButtons = screen.getAllByText('停用')
      fireEvent.click(deactivateButtons[0])

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('停用失敗：停用失敗')
      })
    })
  })

  describe('Pagination', () => {
    it('should handle page changes', async () => {
      mockSubscriptionService.getSubscriptions.mockResolvedValue({
        data: { ...mockResponse, total: 25 },
        loading: false,
        error: undefined
      })

      renderWithProviders(<SubscriptionList />)

      await waitFor(() => {
        expect(screen.getByText('my-service')).toBeInTheDocument()
      })

      const nextPageButton = screen.getByLabelText('下一頁')
      fireEvent.click(nextPageButton)

      await waitFor(() => {
        expect(mockSubscriptionService.getSubscriptions).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 10 })
        )
      })
    })
  })
})
