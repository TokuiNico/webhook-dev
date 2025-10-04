import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authService, AuthCredentials } from '../authService'
import { secureStorage } from '../secureStorage'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock secureStorage
vi.mock('../secureStorage', () => ({
  secureStorage: {
    setSecureItem: vi.fn(),
    getSecureItem: vi.fn().mockReturnValue(null), // Default to null
    removeItem: vi.fn(),
    clearSecureStorage: vi.fn()
  }
}))

describe('AuthService', () => {
  beforeEach(() => {
    // 重設所有 mock
    vi.clearAllMocks()
  })

  describe('authenticate', () => {
    it('應該成功驗證有效的 API 金鑰', async () => {
      // Mock fetch for successful authentication
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          token: 'mock_api_token_123',
          expires_at: Date.now() + (24 * 60 * 60 * 1000)
        })
      }
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const credentials: AuthCredentials = {
        apiKey: 'valid-api-key-12345'
      }

      const result = await authService.authenticate(credentials)

      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.expiresAt).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/auth/verify', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: 'valid-api-key-12345' })
      }))
    })

    it('應該拒絕無效格式的 API 金鑰', async () => {
      const credentials: AuthCredentials = {
        apiKey: 'short'
      }

      const result = await authService.authenticate(credentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API 金鑰格式無效')
      expect(result.token).toBeUndefined()
    })

    it('應該拒絕空 API 金鑰', async () => {
      const credentials: AuthCredentials = {
        apiKey: ''
      }

      const result = await authService.authenticate(credentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API 金鑰格式無效')
    })

    it('應該處理網路錯誤', async () => {
      // Mock 網路錯誤
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const credentials: AuthCredentials = {
        apiKey: 'valid-api-key-12345'
      }

      const result = await authService.authenticate(credentials)

      expect(result.success).toBe(false)
      expect(result.error).toBe('認證失敗，請檢查網路連線')

      // 恢復原來的 fetch
      global.fetch = originalFetch
    })
  })

  describe('isAuthenticated', () => {
    it('應該在有有效令牌時返回 true', () => {
      // 模擬有有效令牌的情況
      const mockToken = 'test-token-123'
      const expiryTime = Date.now() + 3600000 // 1小時後過期

      secureStorage.getSecureItem.mockReturnValue(mockToken)
      localStorage.getItem.mockReturnValue(expiryTime.toString())

      const isAuth = authService.isAuthenticated()
      expect(isAuth).toBe(true)
    })

    it('應該在沒有令牌時返回 false', () => {
      // 清除所有模擬資料
      secureStorage.getSecureItem.mockReturnValue(null)
      localStorage.getItem.mockReturnValue(null)

      const isAuth = authService.isAuthenticated()
      expect(isAuth).toBe(false)
    })

    it('應該在令牌過期時返回 false', () => {
      // 模擬過期的令牌
      const mockToken = 'expired-token-123'
      const expiryTime = Date.now() - 3600000 // 1小時前過期

      secureStorage.getSecureItem.mockReturnValue(mockToken)
      localStorage.getItem.mockReturnValue(expiryTime.toString())

      const isAuth = authService.isAuthenticated()
      expect(isAuth).toBe(false)
    })
  })

  describe('getCurrentToken', () => {
    it('應該返回當前儲存的令牌', () => {
      const mockToken = 'test-token-123'
      secureStorage.getSecureItem.mockReturnValue(mockToken)

      const token = authService.getCurrentToken()
      expect(token).toBe(mockToken)
    })

    it('應該在沒有令牌時返回 null', () => {
      // 清除所有模擬資料
      secureStorage.getSecureItem.mockReturnValue(null)

      const token = authService.getCurrentToken()
      expect(token).toBeNull()
    })
  })

  describe('logout', () => {
    it('應該清除所有認證相關資料', () => {
      // 設定一些測試資料
      secureStorage.getSecureItem.mockReturnValue('test-token')
      localStorage.getItem.mockReturnValue('1234567890')

      authService.logout()

      // logout 會呼叫 clearSecureStorage，所以 secureStorage 也會被清除
      expect(secureStorage.clearSecureStorage).toHaveBeenCalled()
      expect(localStorage.removeItem).toHaveBeenCalledWith('webhook_token_expiry')
    })
  })

  describe('shouldRefreshToken', () => {
    it('應該在令牌即將過期時返回 true', () => {
      // 設定5分鐘後過期的令牌
      const mockToken = 'test-token-123'
      const expiryTime = Date.now() + (5 * 60 * 1000) // 5分鐘後過期

      secureStorage.getSecureItem.mockReturnValue(mockToken)
      localStorage.getItem.mockReturnValue(expiryTime.toString())

      const shouldRefresh = authService.shouldRefreshToken()
      expect(shouldRefresh).toBe(true)
    })

    it('應該在令牌還有很多時間時返回 false', () => {
      // 設定2小時後過期的令牌
      const mockToken = 'test-token-123'
      const expiryTime = Date.now() + (2 * 60 * 60 * 1000) // 2小時後過期

      secureStorage.getSecureItem.mockReturnValue(mockToken)
      localStorage.getItem.mockReturnValue(expiryTime.toString())

      const shouldRefresh = authService.shouldRefreshToken()
      expect(shouldRefresh).toBe(false)
    })

    it('應該在沒有令牌時返回 false', () => {
      // 清除所有模擬資料
      secureStorage.getSecureItem.mockReturnValue(null)
      localStorage.getItem.mockReturnValue(null)

      const shouldRefresh = authService.shouldRefreshToken()
      expect(shouldRefresh).toBe(false)
    })
  })
})
