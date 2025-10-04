import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from '../LoginForm'
import { AuthProvider } from '../../hooks/useAuth'

// Mock the auth service
vi.mock('../../services/authService', () => ({
  authService: {
    authenticate: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    getCurrentToken: vi.fn(() => null)
  },
  AuthCredentials: {},
  AuthResult: {}
}))

// Mock the secure storage
vi.mock('../../services/secureStorage', () => ({
  secureStorage: {
    setSecureItem: vi.fn(),
    getSecureItem: vi.fn(),
    removeItem: vi.fn(),
    clearSecureStorage: vi.fn()
  }
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('LoginForm', () => {
  const mockOnLoginSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          {component}
        </AuthProvider>
      </BrowserRouter>
    )
  }

  it('應該正確渲染登入表單', () => {
    renderWithRouter(<LoginForm />)

    expect(screen.getByText('Webhook Gateway 管理介面')).toBeInTheDocument()
    expect(screen.getByText('請輸入您的 API 金鑰以繼續')).toBeInTheDocument()
    expect(screen.getByLabelText(/api 金鑰/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登入/i })).toBeInTheDocument()
  })

  it('應該在輸入 API 金鑰時更新表單狀態', () => {
    renderWithRouter(<LoginForm />)

    const apiKeyInput = screen.getByLabelText(/api 金鑰/i)

    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-123' } })

    expect(apiKeyInput).toHaveValue('test-api-key-123')
  })

  it('應該在有效輸入時啟用登入按鈕', () => {
    renderWithRouter(<LoginForm />)

    const apiKeyInput = screen.getByLabelText(/api 金鑰/i)
    const loginButton = screen.getByRole('button', { name: /登入/i })

    // 初始狀態應該禁用按鈕
    expect(loginButton).toBeDisabled()

    // 輸入有效 API 金鑰後應該啟用按鈕
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-12345' } })
    expect(loginButton).not.toBeDisabled()
  })

  it('應該在登入成功時導航到儀表板', async () => {
    const { authService } = await import('../../services/authService')
    ;(authService.authenticate as any).mockResolvedValue({
      success: true,
      token: 'mock-token',
      expiresAt: Date.now() + 3600000
    })

    renderWithRouter(<LoginForm onLoginSuccess={mockOnLoginSuccess} />)

    const apiKeyInput = screen.getByLabelText(/api 金鑰/i)
    const loginButton = screen.getByRole('button', { name: /登入/i })

    fireEvent.change(apiKeyInput, { target: { value: 'valid-api-key-12345' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('應該在登入失敗時顯示錯誤訊息', async () => {
    const { authService } = await import('../../services/authService')
    ;(authService.authenticate as any).mockResolvedValue({
      success: false,
      error: '無效的 API 金鑰'
    })

    renderWithRouter(<LoginForm />)

    const apiKeyInput = screen.getByLabelText(/api 金鑰/i)
    const loginButton = screen.getByRole('button', { name: /登入/i })

    fireEvent.change(apiKeyInput, { target: { value: 'invalid-key' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('無效的 API 金鑰')).toBeInTheDocument()
    })
  })

  it('應該在登入過程中顯示載入狀態', async () => {
    const { authService } = await import('../../services/authService')
    // 模擬較長的 API 呼叫
    ;(authService.authenticate as any).mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({ success: true }), 100)
      )
    )

    renderWithRouter(<LoginForm />)

    const apiKeyInput = screen.getByLabelText(/api 金鑰/i)
    const loginButton = screen.getByRole('button', { name: /登入/i })

    fireEvent.change(apiKeyInput, { target: { value: 'valid-api-key-12345' } })
    fireEvent.click(loginButton)

    // 應該顯示載入狀態
    expect(screen.getByText('驗證中...')).toBeInTheDocument()
    expect(loginButton).toBeDisabled()

    // 等待載入完成
    await waitFor(() => {
      expect(screen.queryByText('驗證中...')).not.toBeInTheDocument()
    })
  })
})
