import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * 保護路由元件
 * 確保只有經過認證的用戶才能訪問受保護的頁面
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()

  // 如果認證狀態正在載入，顯示載入指示器
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div
            data-testid="loading-spinner"
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          ></div>
          <p className="mt-4 text-sm text-gray-600">驗證中...</p>
        </div>
      </div>
    )
  }

  // 如果用戶未認證，重定向到登入頁面
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 用戶已認證，渲染子元件
  return <>{children}</>
}
