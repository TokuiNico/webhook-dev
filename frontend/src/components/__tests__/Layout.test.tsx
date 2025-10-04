import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'
import { AuthProvider } from '../../hooks/useAuth'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}))

describe('Layout', () => {
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

  it('renders sidebar with navigation items', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: 'test-token'
    })

    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )

    expect(screen.getByText('Webhook Gateway')).toBeInTheDocument()
    expect(screen.getByText('儀表板')).toBeInTheDocument()
    expect(screen.getByText('來源管理')).toBeInTheDocument()
    expect(screen.getByText('主題管理')).toBeInTheDocument()
    expect(screen.getByText('訂閱管理')).toBeInTheDocument()
    expect(screen.getByText('日誌檢視')).toBeInTheDocument()
  })

  it('renders header with user info and logout button', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: 'test-token'
    })

    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )

    expect(screen.getByText('管理員')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登出/i })).toBeInTheDocument()
  })

  it('renders main content area', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: 'test-token'
    })

    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies active class to current route', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      currentToken: 'test-token'
    })

    // Use MemoryRouter with initial entry to test active route
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <Layout>
            <div>Test Content</div>
          </Layout>
        </AuthProvider>
      </MemoryRouter>
    )

    const dashboardLink = screen.getByText('儀表板').closest('a')
    expect(dashboardLink).toHaveClass('bg-blue-50', 'border-r-2', 'border-blue-500')
  })

  it('calls logout when logout button is clicked', async () => {
    const mockLogout = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: mockLogout,
      refreshToken: vi.fn(),
      currentToken: 'test-token'
    })

    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )

    const logoutButton = screen.getByRole('button', { name: /登出/i })
    logoutButton.click()

    expect(mockLogout).toHaveBeenCalled()
  })
})
