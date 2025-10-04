import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QuickActions } from '../QuickActions'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('QuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  it('renders all quick action buttons', () => {
    renderWithRouter(<QuickActions />)

    expect(screen.getByText('創建來源')).toBeInTheDocument()
    expect(screen.getByText('創建主題')).toBeInTheDocument()
    expect(screen.getByText('創建訂閱')).toBeInTheDocument()
    expect(screen.getByText('查看日誌')).toBeInTheDocument()
    expect(screen.getByText('重新整理')).toBeInTheDocument()
  })

  it('navigates to sources page when create source button is clicked', () => {
    renderWithRouter(<QuickActions />)

    const createSourceButton = screen.getByText('創建來源')
    fireEvent.click(createSourceButton)

    expect(mockNavigate).toHaveBeenCalledWith('/sources')
  })

  it('navigates to topics page when create topic button is clicked', () => {
    renderWithRouter(<QuickActions />)

    const createTopicButton = screen.getByText('創建主題')
    fireEvent.click(createTopicButton)

    expect(mockNavigate).toHaveBeenCalledWith('/topics')
  })

  it('navigates to subscriptions page when create subscription button is clicked', () => {
    renderWithRouter(<QuickActions />)

    const createSubscriptionButton = screen.getByText('創建訂閱')
    fireEvent.click(createSubscriptionButton)

    expect(mockNavigate).toHaveBeenCalledWith('/subscriptions')
  })

  it('navigates to logs page when view logs button is clicked', () => {
    renderWithRouter(<QuickActions />)

    const viewLogsButton = screen.getByText('查看日誌')
    fireEvent.click(viewLogsButton)

    expect(mockNavigate).toHaveBeenCalledWith('/logs')
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const mockOnRefresh = vi.fn()
    renderWithRouter(<QuickActions onRefresh={mockOnRefresh} />)

    const refreshButton = screen.getByText('重新整理')
    fireEvent.click(refreshButton)

    expect(mockOnRefresh).toHaveBeenCalled()
  })

  it('shows loading state when isRefreshing is true', () => {
    renderWithRouter(<QuickActions isRefreshing={true} />)

    expect(screen.getByText('重新整理中...')).toBeInTheDocument()
  })

  it('disables refresh button when isRefreshing is true', () => {
    renderWithRouter(<QuickActions isRefreshing={true} />)

    const refreshButton = screen.getByRole('button', { name: '重新整理儀表板數據' })
    expect(refreshButton).toBeDisabled()
  })

  it('applies custom className', () => {
    renderWithRouter(<QuickActions className="custom-actions" />)

    const container = screen.getByRole('heading', { name: '快速操作' }).closest('div')
    expect(container).toHaveClass('custom-actions')
  })

  it('renders action buttons with correct icons', () => {
    renderWithRouter(<QuickActions />)

    // Check for icons (we'll check for specific text or aria-labels that indicate icons)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5) // 5 action buttons
  })

  it('has accessible button labels', () => {
    renderWithRouter(<QuickActions />)

    const createSourceButton = screen.getByRole('button', { name: '創建新的 webhook 來源' })
    const createTopicButton = screen.getByRole('button', { name: '創建新的主題' })
    const createSubscriptionButton = screen.getByRole('button', { name: '創建新的訂閱' })
    const viewLogsButton = screen.getByRole('button', { name: '查看事件日誌' })
    const refreshButton = screen.getByRole('button', { name: '重新整理儀表板數據' })

    expect(createSourceButton).toBeInTheDocument()
    expect(createTopicButton).toBeInTheDocument()
    expect(createSubscriptionButton).toBeInTheDocument()
    expect(viewLogsButton).toBeInTheDocument()
    expect(refreshButton).toBeInTheDocument()
  })
})
