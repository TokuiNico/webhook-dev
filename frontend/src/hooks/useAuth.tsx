import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
    const initAuth = () => {
      const token = authService.getCurrentToken()
      const authenticated = authService.isAuthenticated()

      setCurrentToken(token)
      setIsAuthenticated(authenticated)
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (credentials: AuthCredentials): Promise<AuthResult> => {
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
  }

  const logout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setCurrentToken(null)
  }

  const refreshToken = async () => {
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
  }

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    currentToken
  }

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
