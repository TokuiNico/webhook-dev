import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { SourceForm } from '../SourceForm'
import { sourceService } from '../../services/sourceService'
import type { SourceCreate } from '../../types/source'

// Mock the source service
vi.mock('../../services/sourceService', () => ({
  sourceService: {
    createSource: vi.fn(),
    checkSourceNameAvailability: vi.fn()
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

describe('SourceForm', () => {
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

  it('renders form with all required fields', () => {
    renderWithProviders(<SourceForm />)

    expect(screen.getByText('新增來源')).toBeInTheDocument()
    expect(screen.getByLabelText(/來源名稱/)).toBeInTheDocument()
    expect(screen.getByLabelText(/認證密鑰/)).toBeInTheDocument()
    expect(screen.getByLabelText(/認證類型/)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    renderWithProviders(<SourceForm />)

    const submitButton = screen.getByText('創建來源')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('來源名稱為必填項目')).toBeInTheDocument()
      expect(screen.getByText('認證密鑰為必填項目')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const mockSourceData: SourceCreate = {
      name: 'github',
      secret: 'test-secret',
      auth_type: 'signature',
      auth_config: { signature_header: 'X-Hub-Signature-256' }
    }

    mockSourceService.createSource.mockResolvedValue({
      data: { id: 'test-id', ...mockSourceData, created_at: '2024-01-01T00:00:00Z' },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceForm />)

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/來源名稱/), {
      target: { value: 'github' }
    })
    fireEvent.change(screen.getByLabelText(/認證密鑰/), {
      target: { value: 'test-secret' }
    })
    fireEvent.change(screen.getByLabelText(/認證類型/), {
      target: { value: 'signature' }
    })

    const submitButton = screen.getByText('創建來源')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSourceService.createSource).toHaveBeenCalledWith(mockSourceData)
    })
  })

  it('shows loading state during submission', async () => {
    mockSourceService.createSource.mockImplementation(() => new Promise(() => {}))

    renderWithProviders(<SourceForm />)

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/來源名稱/), {
      target: { value: 'github' }
    })
    fireEvent.change(screen.getByLabelText(/認證密鑰/), {
      target: { value: 'test-secret' }
    })

    const submitButton = screen.getByText('創建來源')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('創建中...')).toBeInTheDocument()
      expect(screen.getByText('創建中...')).toBeDisabled()
    })
  })

  it('handles submission errors', async () => {
    mockSourceService.createSource.mockResolvedValue({
      data: undefined,
      loading: false,
      error: { message: '來源名稱已存在' }
    })

    renderWithProviders(<SourceForm />)

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/來源名稱/), {
      target: { value: 'github' }
    })
    fireEvent.change(screen.getByLabelText(/認證密鑰/), {
      target: { value: 'test-secret' }
    })

    const submitButton = screen.getByText('創建來源')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('來源名稱已存在')).toBeInTheDocument()
    })
  })

  it('navigates to sources list on successful creation', async () => {
    mockSourceService.createSource.mockResolvedValue({
      data: { id: 'test-id', name: 'github', created_at: '2024-01-01T00:00:00Z' },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceForm />)

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/來源名稱/), {
      target: { value: 'github' }
    })
    fireEvent.change(screen.getByLabelText(/認證密鑰/), {
      target: { value: 'test-secret' }
    })

    const submitButton = screen.getByText('創建來源')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/sources')
    })
  })

  it('shows auth config fields when signature auth is selected', async () => {
    renderWithProviders(<SourceForm />)

    const authTypeSelect = screen.getByLabelText(/認證類型/)
    fireEvent.change(authTypeSelect, { target: { value: 'signature' } })

    await waitFor(() => {
      expect(screen.getByLabelText(/簽名標頭/)).toBeInTheDocument()
      expect(screen.getByLabelText(/演算法/)).toBeInTheDocument()
    })
  })

  it('hides auth config fields when no auth is selected', async () => {
    renderWithProviders(<SourceForm />)

    const authTypeSelect = screen.getByLabelText(/認證類型/)
    fireEvent.change(authTypeSelect, { target: { value: 'none' } })

    await waitFor(() => {
      expect(screen.queryByLabelText(/簽名標頭/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/演算法/)).not.toBeInTheDocument()
    })
  })

  it('validates source name format', async () => {
    renderWithProviders(<SourceForm />)

    const nameInput = screen.getByLabelText(/來源名稱/)
    fireEvent.change(nameInput, { target: { value: 'invalid name with spaces' } })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(screen.getByText('來源名稱只能包含小寫字母、數字和連字號')).toBeInTheDocument()
    })
  })

  it('validates secret strength', async () => {
    renderWithProviders(<SourceForm />)

    const secretInput = screen.getByLabelText(/認證密鑰/)
    fireEvent.change(secretInput, { target: { value: '123' } })
    fireEvent.blur(secretInput)

    await waitFor(() => {
      expect(screen.getByText('認證密鑰至少需要 8 個字符')).toBeInTheDocument()
    })
  })

  it('checks name availability when name changes', async () => {
    mockSourceService.checkSourceNameAvailability.mockResolvedValue({
      data: { available: false },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceForm />)

    const nameInput = screen.getByLabelText(/來源名稱/)
    fireEvent.change(nameInput, { target: { value: 'github' } })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(mockSourceService.checkSourceNameAvailability).toHaveBeenCalledWith('github')
      expect(screen.getByText('此來源名稱已被使用')).toBeInTheDocument()
    })
  })

  it('shows success message when name is available', async () => {
    mockSourceService.checkSourceNameAvailability.mockResolvedValue({
      data: { available: true },
      loading: false,
      error: undefined
    })

    renderWithProviders(<SourceForm />)

    const nameInput = screen.getByLabelText(/來源名稱/)
    fireEvent.change(nameInput, { target: { value: 'unique-name' } })
    fireEvent.blur(nameInput)

    await waitFor(() => {
      expect(screen.getByText('✓ 來源名稱可用')).toBeInTheDocument()
    })
  })

  it('navigates back when cancel button is clicked', () => {
    renderWithProviders(<SourceForm />)

    const cancelButton = screen.getByText('取消')
    fireEvent.click(cancelButton)

    expect(mockNavigate).toHaveBeenCalledWith('/sources')
  })

  it('applies custom className', () => {
    renderWithProviders(<SourceForm className="custom-form" />)

    const form = screen.getByRole('form')
    expect(form).toHaveClass('custom-form')
  })
})
