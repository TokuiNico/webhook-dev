import React, { Component, ReactNode, ErrorInfo } from 'react'

interface AppContainerProps {
  children?: ReactNode
}

interface AppContainerState {
  hasError: boolean
  error?: Error
  isLoading: boolean
}

/**
 * 應用程式容器元件
 * 提供頂層狀態管理和錯誤處理
 */
class AppContainerClass extends Component<AppContainerProps, AppContainerState> {
  constructor(props: AppContainerProps) {
    super(props)

    this.state = {
      hasError: false,
      isLoading: false
    }
  }

  static getDerivedStateFromError(error: Error): AppContainerState {
    return {
      hasError: true,
      error,
      isLoading: false
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('應用程式錯誤:', error, errorInfo)

    // 在生產環境中，這裡可以發送錯誤報告到監控服務
    // reportError(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      isLoading: false
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    if (this.state.isLoading) {
      return <LoadingSpinner />
    }

    return (
      <div data-testid="app-container" className="min-h-screen bg-gray-50">
        {this.props.children}
      </div>
    )
  }
}

/**
 * 錯誤回退元件
 */
interface ErrorFallbackProps {
  error?: Error
  onRetry: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          應用程式發生錯誤
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          抱歉，應用程式遇到了一些問題。請嘗試重新載入頁面。
        </p>
        {error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              錯誤詳情
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <div className="mt-6">
          <button
            onClick={onRetry}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            重試
          </button>
        </div>
      </div>
    </div>
  </div>
)

/**
 * 載入中元件
 */
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div
        data-testid="loading-spinner"
        className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
      ></div>
      <p className="mt-4 text-sm text-gray-600">載入中...</p>
    </div>
  </div>
)

/**
 * 應用程式容器元件
 * 提供頂層狀態管理和錯誤處理
 */
export const AppContainer: React.FC<AppContainerProps> = (props) => {
  return <AppContainerClass {...props} />
}
