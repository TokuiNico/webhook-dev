import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { SourceDetail } from '../SourceDetail'
import { sourceService } from '../../services/sourceService'
import type { SourceResponse } from '../../types/source'

// Mock the source service
vi.mock('../../services/sourceService', () => ({
  sourceService: {
    getSource: vi.fn()
  }
}))

const mockSourceService = vi.mocked(sourceService)

// Mock the router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ sourceId: '01ARZ3NDEKTSV4RRFFQ69G5FAV' })
  }
})

describe('SourceDetail', () => {
  const mockSource: SourceResponse = {
    id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    name: 'github',
    auth_type: 'signature',
    auth_config: {
      signature_header: 'X-Hub-Signature-256',
      algorithm: 'sha256'
    },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z'
  }

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
    mockSourceService.getSource.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<SourceDetail />)

    expect(screen.getByText('載入來源詳情中...')).toBeInTheDocument()
  })

  it('renders source details when data is loaded', async () => {
    mockSourceService.getSource.mockResolvedValue({
      data: mockSource,
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('github')).toBeInTheDocument()
      expect(screen.getByText('簽名驗證')).toBeInTheDocument()
      expect(screen.getByText('2024/1/1')).toBeInTheDocument()
      expect(screen.getByText('2024/1/2')).toBeInTheDocument()
    })
  })

  it('displays auth configuration details', async () => {
    mockSourceService.getSource.mockResolvedValue({
      data: mockSource,
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('X-Hub-Signature-256')).toBeInTheDocument()
      expect(screen.getByText('sha256')).toBeInTheDocument()
    })
  })

  it('shows error message when loading fails', async () => {
    mockSourceService.getSource.mockResolvedValue({
      data: undefined,
      loading: false,
      error: { message: '來源不存在' }
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('來源不存在')).toBeInTheDocument()
      expect(screen.getByText('重新載入')).toBeInTheDocument()
    })
  })

  it('displays source details when loaded', async () => {
    mockSourceService.getSource.mockResolvedValue({
      data: mockSource,
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('來源詳情')).toBeInTheDocument()
      // Check for the source name in the subtitle (should be in the p tag)
      const subtitle = screen.getByText('github').closest('p')
      expect(subtitle).toHaveClass('text-gray-600')

      // Check for auth type in the table
      const authTypeElements = screen.getAllByText('簽名驗證')
      expect(authTypeElements.length).toBeGreaterThan(0)
    })
  })

  it('shows edit and delete buttons', async () => {
    mockSourceService.getSource.mockResolvedValue({
      data: mockSource,
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('編輯來源')).toBeInTheDocument()
      expect(screen.getByText('刪除來源')).toBeInTheDocument()
    })
  })

  it('displays source ID in technical details', async () => {
    mockSourceService.getSource.mockResolvedValue({
      data: mockSource,
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBeInTheDocument()
    })
  })

  it('shows different auth type displays', async () => {
    const noneAuthSource: SourceResponse = {
      ...mockSource,
      auth_type: 'none'
    }

    mockSourceService.getSource.mockResolvedValue({
      data: noneAuthSource,
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceDetail />)

    await waitFor(() => {
      expect(screen.getByText('無驗證')).toBeInTheDocument()
      // Should not show auth config for none type
      expect(screen.queryByText('X-Hub-Signature-256')).not.toBeInTheDocument()
    })
  })
})
