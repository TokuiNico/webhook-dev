import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { SourceList } from '../SourceList'
import { sourceService } from '../../services/sourceService'
import type { SourceResponse } from '../../types/source'

// Mock the source service
vi.mock('../../services/sourceService', () => ({
  sourceService: {
    getSources: vi.fn()
  }
}))

const mockSourceService = vi.mocked(sourceService)

// Mock the router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('SourceList', () => {
  const mockSources: SourceResponse[] = [
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      name: 'github',
      auth_type: 'signature',
      auth_config: { signature_header: 'X-Hub-Signature-256' },
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAW',
      name: 'stripe',
      auth_type: 'signature',
      created_at: '2024-01-02T10:00:00Z'
    }
  ]

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
    mockSourceService.getSources.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<SourceList />)

    expect(screen.getByText('載入來源列表中...')).toBeInTheDocument()
  })

  it('renders sources list when data is loaded', async () => {
    mockSourceService.getSources.mockResolvedValue({
      data: {
        items: mockSources,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceList />)

    await waitFor(() => {
      expect(screen.getByText('github')).toBeInTheDocument()
      expect(screen.getByText('stripe')).toBeInTheDocument()
    })
  })

  it('shows empty state when no sources exist', async () => {
    mockSourceService.getSources.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceList />)

    await waitFor(() => {
      expect(screen.getByText('尚未建立任何來源')).toBeInTheDocument()
      expect(screen.getByText('創建第一個來源來開始接收 webhook 事件')).toBeInTheDocument()
    })
  })

  it('shows error message when loading fails', async () => {
    mockSourceService.getSources.mockResolvedValue({
      data: undefined,
      loading: false,
      error: { message: '載入失敗' }
    })

    renderWithProviders(<SourceList />)

    await waitFor(() => {
      const errorElements = screen.getAllByText('載入失敗')
      expect(errorElements).toHaveLength(2) // Title and description
    })
  })

  it('navigates to create page when create button is clicked', async () => {
    mockSourceService.getSources.mockResolvedValue({
      data: {
        items: [],
        total: 0,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceList />)

    await waitFor(() => {
      const createButton = screen.getByText('創建第一個來源')
      fireEvent.click(createButton)
    })

    expect(mockNavigate).toHaveBeenCalledWith('/sources/create')
  })

  it('displays correct source information in table', async () => {
    mockSourceService.getSources.mockResolvedValue({
      data: {
        items: mockSources,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceList />)

    await waitFor(() => {
      // Check for auth type badges in table rows
      const authTypeElements = screen.getAllByText('簽名驗證')
      expect(authTypeElements.length).toBeGreaterThan(0)

      // Check for formatted dates
      expect(screen.getByText('2024/1/1')).toBeInTheDocument()
      expect(screen.getByText('2024/1/2')).toBeInTheDocument()
    })
  })

  it('displays correct statistics', async () => {
    mockSourceService.getSources.mockResolvedValue({
      data: {
        items: mockSources,
        total: 2,
        skip: 0,
        limit: 100
      },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceList />)

    await waitFor(() => {
      expect(screen.getByText('來源管理')).toBeInTheDocument()
      expect(screen.getByText('共 2 個來源')).toBeInTheDocument()
    })
  })
})
