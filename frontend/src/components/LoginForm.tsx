import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthCredentials } from '../services/authService'

interface LoginFormProps {
  onLoginSuccess?: () => void
}

export const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [credentials, setCredentials] = useState<AuthCredentials>({
    apiKey: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await login(credentials)

      if (result.success) {
        onLoginSuccess?.()
        // 登入成功後導航到儀表板
        navigate('/', { replace: true })
      } else {
        setError(result.error || '登入失敗')
      }
    } catch (err) {
      setError('登入過程中發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      apiKey: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Webhook Gateway 管理介面
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            請輸入您的 API 金鑰以繼續
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="api-key" className="sr-only">
                API 金鑰
              </label>
              <input
                id="api-key"
                name="apiKey"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="輸入您的 API 金鑰"
                value={credentials.apiKey}
                onChange={handleApiKeyChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {error}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || !credentials.apiKey.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  驗證中...
                </span>
              ) : (
                '登入'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              API 金鑰將被安全儲存在瀏覽器中，不會傳送到第三方服務器
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
