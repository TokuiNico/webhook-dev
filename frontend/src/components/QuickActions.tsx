import { useNavigate } from 'react-router-dom'

interface QuickActionsProps {
  /** 重新整理回調函數 */
  onRefresh?: () => void
  /** 是否正在重新整理 */
  isRefreshing?: boolean
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 快速操作按鈕元件
 * 提供常用管理功能的快捷訪問
 */
export const QuickActions = ({
  onRefresh,
  isRefreshing = false,
  className = ''
}: QuickActionsProps) => {
  const navigate = useNavigate()

  const handleCreateSource = () => {
    navigate('/sources')
  }

  const handleCreateTopic = () => {
    navigate('/topics')
  }

  const handleCreateSubscription = () => {
    navigate('/subscriptions')
  }

  const handleViewLogs = () => {
    navigate('/logs')
  }

  const handleRefresh = () => {
    onRefresh?.()
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 創建來源按鈕 */}
        <button
          onClick={handleCreateSource}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
          aria-label="創建新的 webhook 來源"
        >
          <div className="p-3 bg-blue-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">創建來源</span>
          <span className="text-xs text-gray-500 mt-1">新增 webhook 來源</span>
        </button>

        {/* 創建主題按鈕 */}
        <button
          onClick={handleCreateTopic}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
          aria-label="創建新的主題"
        >
          <div className="p-3 bg-green-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">創建主題</span>
          <span className="text-xs text-gray-500 mt-1">組織事件類型</span>
        </button>

        {/* 創建訂閱按鈕 */}
        <button
          onClick={handleCreateSubscription}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200"
          aria-label="創建新的訂閱"
        >
          <div className="p-3 bg-purple-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">創建訂閱</span>
          <span className="text-xs text-gray-500 mt-1">設定事件接收者</span>
        </button>

        {/* 查看日誌按鈕 */}
        <button
          onClick={handleViewLogs}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
          aria-label="查看事件日誌"
        >
          <div className="p-3 bg-orange-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900">查看日誌</span>
          <span className="text-xs text-gray-500 mt-1">監控事件歷史</span>
        </button>

        {/* 重新整理按鈕 */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="重新整理儀表板數據"
        >
          <div className="p-3 bg-gray-100 rounded-full mb-3">
            {isRefreshing ? (
              <svg className="w-6 h-6 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium text-gray-900">
            {isRefreshing ? '重新整理中...' : '重新整理'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            {isRefreshing ? '更新數據' : '刷新統計'}
          </span>
        </button>
      </div>

      {/* 操作說明 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              使用這些快速操作按鈕可以直接跳轉到相應的管理頁面，或重新整理當前數據。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
