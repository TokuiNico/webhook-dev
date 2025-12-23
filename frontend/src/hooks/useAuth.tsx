import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { authService, AuthCredentials, AuthResult } from '../services/authService'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: AuthCredentials) => Promise<AuthResult>
  logout: () => void
  refreshToken: () => Promise<void>
  currentToken: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentToken, setCurrentToken] = useState<string | null>(null)

  // 初始化時檢查現有的認證狀態
  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getCurrentToken()
      const authenticated = authService.isAuthenticated()

      setCurrentToken(token)
      setIsAuthenticated(authenticated)
      setIsLoading(false)

      // 如果已認證且需要刷新，進行刷新
      if (authenticated && authService.shouldRefreshToken()) {
        try {
          await authService.refreshToken()
          const newToken = authService.getCurrentToken()
          setCurrentToken(newToken)
        } catch (error) {
          console.error('初始化時刷新令牌失敗:', error)
        }
      }

      // 開發環境自動登入
      if (!authenticated && import.meta.env.DEV) {
        try {
          console.log('開發環境自動登入中...')
          const result = await authService.authenticate({ apiKey: 'hello' })
          if (result.success) {
            setCurrentToken(result.token || null)
            setIsAuthenticated(true)
            console.log('開發環境自動登入成功')
          } else {
            console.log('開發環境自動登入失敗:', result.error)
          }
        } catch (error) {
          console.log('開發環境自動登入出錯:', error)
        }
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (credentials: AuthCredentials): Promise<AuthResult> => {
    setIsLoading(true)

    try {
      const result = await authService.authenticate(credentials)

      if (result.success && result.token) {
        setIsAuthenticated(true)
        setCurrentToken(result.token)
      }

      setIsLoading(false)
      return result
    } catch (error) {
      setIsLoading(false)
      return {
        success: false,
        error: '登入過程中發生錯誤'
      }
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setIsAuthenticated(false)
    setCurrentToken(null)
  }, [])

  const refreshToken = useCallback(async () => {
    try {
      const result = await authService.refreshToken()

      if (result.success && result.token) {
        setCurrentToken(result.token)
      } else {
        // 如果刷新失敗，強制登出
        logout()
      }
    } catch (error) {
      console.error('令牌刷新失敗:', error)
      logout()
    }
  }, [logout])

  const value = useMemo<AuthContextType>(() => ({
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    currentToken
  }), [isAuthenticated, isLoading, login, logout, refreshToken, currentToken])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
