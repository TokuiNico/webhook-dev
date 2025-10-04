import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AppContainer } from '../AppContainer'
import { AuthProvider } from '../../hooks/useAuth'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}))

describe('AppContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: null
    })

    render(
      <AuthProvider>
        <AppContainer />
      </AuthProvider>
    )

    expect(screen.getByTestId('app-container')).toBeInTheDocument()
  })

  it('shows loading state when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: null
    })

    render(<AppContainer />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays error boundary when error occurs', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: null
    })

    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <AuthProvider>
        <AppContainer>
          <ThrowError />
        </AppContainer>
      </AuthProvider>
    )

    expect(screen.getByText('應用程式發生錯誤')).toBeInTheDocument()
  })

  it('renders children when no error', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: null
    })

    render(
      <AuthProvider>
        <AppContainer>
          <div>Test Content</div>
        </AppContainer>
      </AuthProvider>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
