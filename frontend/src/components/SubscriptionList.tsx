import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionService } from '../services/subscriptionService'
import type { SubscriptionResponse, SubscriptionFilterParams } from '../types/subscription'

interface SubscriptionListProps {
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 訂閱列表頁面元件
 * 顯示所有 webhook 訂閱，提供搜尋、篩選、分頁等功能
 */
export const SubscriptionList = ({ className = '' }: SubscriptionListProps) => {
  const navigate = useNavigate()
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)

  // 篩選條件
  const [filters, setFilters] = useState<SubscriptionFilterParams>({
    skip: 0,
    limit: pageSize
  })

  // 載入訂閱列表
  const loadSubscriptions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await subscriptionService.getSubscriptions(filters)

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setSubscriptions(response.data.items)
        setTotal(response.data.total)
      }
    } catch (err) {
      setError('載入訂閱列表失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始載入和篩選變更時重新載入
  useEffect(() => {
    loadSubscriptions()
  }, [filters])

  // 處理訂閱者名稱搜尋
  const handleSubscriberSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      subscriber_name: searchTerm || undefined,
      skip: 0 // 重置到第一頁
    }))
    setCurrentPage(0)
  }

  // 處理主題 ID 篩選
  const handleTopicFilter = (topicId: string) => {
    setFilters(prev => ({
      ...prev,
      topic_id: topicId || undefined,
      skip: 0 // 重置到第一頁
    }))
    setCurrentPage(0)
  }

  // 處理活躍狀態篩選
  const handleActiveFilter = (isActive: string) => {
    setFilters(prev => ({
      ...prev,
      is_active: isActive === '' ? undefined : isActive === 'true',
      skip: 0 // 重置到第一頁
    }))
    setCurrentPage(0)
  }

  // 處理分頁
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters(prev => ({
      ...prev,
      skip: newPage * pageSize
    }))
  }

  // 處理停用訂閱
  const handleDeactivateSubscription = async (subscriptionId: string, subscriberName: string) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!confirm(`確定要停用訂閱 "${subscriberName}" 嗎？訂閱將停止接收 webhook 事件。`)) {
      return
    }

    try {
      const response = await subscriptionService.deactivateSubscription(subscriptionId)

      if (response.error) {
        alert(`停用失敗：${response.error.message}`)
      } else {
        alert('訂閱停用成功')
        loadSubscriptions() // 重新載入列表
      }
    } catch (err) {
      alert('停用訂閱時發生錯誤')
    }
  }

  // 處理啟用訂閱
  const handleActivateSubscription = async (subscriptionId: string, subscriberName: string) => {
    try {
      const response = await subscriptionService.activateSubscription(subscriptionId)

      if (response.error) {
        alert(`啟用失敗：${response.error.message}`)
      } else {
        alert('訂閱啟用成功')
        loadSubscriptions() // 重新載入列表
      }
    } catch (err) {
      alert('啟用訂閱時發生錯誤')
    }
  }


  // 載入狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">訂閱管理</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入訂閱列表中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">訂閱管理</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadSubscriptions}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 頁面標題和統計 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">訂閱管理</h1>
          <p className="text-gray-600">管理 webhook 事件訂閱</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">共 {total} 個訂閱</p>
        </div>
      </div>

      {/* 搜尋和篩選工具列 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 訂閱者名稱搜尋 */}
          <div className="flex-1">
            <label htmlFor="subscriberSearch" className="block text-sm font-medium text-gray-700 mb-1">
              搜尋訂閱者名稱
            </label>
            <input
              type="text"
              id="subscriberSearch"
              placeholder="搜尋訂閱者名稱..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleSubscriberSearch(e.target.value)}
            />
          </div>

          {/* 主題篩選 */}
          <div className="sm:w-48">
            <label htmlFor="topicFilter" className="block text-sm font-medium text-gray-700 mb-1">
              主題 ID
            </label>
            <input
              type="text"
              id="topicFilter"
              placeholder="輸入主題 ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleTopicFilter(e.target.value)}
            />
          </div>

          {/* 活躍狀態篩選 */}
          <div className="sm:w-48">
            <label htmlFor="activeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              狀態
            </label>
            <select
              id="activeFilter"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleActiveFilter(e.target.value)}
              defaultValue=""
            >
              <option value="">全部</option>
              <option value="true">活躍</option>
              <option value="false">停用</option>
            </select>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/subscriptions/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              新增訂閱
            </button>
          </div>
        </div>
      </div>

      {/* 訂閱列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {subscriptions.length === 0 ? (
          /* 空狀態 */
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-4-4m0 0l-4 4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">尚未建立任何訂閱</h3>
            <p className="mt-2 text-gray-600">創建第一個訂閱來開始接收 webhook 事件</p>
            <button
              onClick={() => navigate('/subscriptions/create')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              創建第一個訂閱
            </button>
          </div>
        ) : (
          <>
            {/* 表格標頭 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    顯示 {Math.min((currentPage * pageSize) + 1, total)}-{Math.min((currentPage + 1) * pageSize, total)} 筆，共 {total} 筆
                  </span>
                </div>
              </div>
            </div>

            {/* 訂閱表格 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      訂閱者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      主題 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      目標 URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      創建時間
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{subscription.subscriber_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">{subscription.topic_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 max-w-xs truncate" title={subscription.target_url}>
                          {subscription.target_url}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          subscription.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subscription.is_active ? '活躍' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(subscription.created_at).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/subscriptions/${subscription.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          檢視
                        </button>
                        <button
                          onClick={() => navigate(`/subscriptions/${subscription.id}/edit`)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          編輯
                        </button>
                        {subscription.is_active ? (
                          <button
                            onClick={() => handleDeactivateSubscription(subscription.id, subscription.subscriber_name)}
                            className="text-red-600 hover:text-red-900 mr-4"
                          >
                            停用
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateSubscription(subscription.id, subscription.subscriber_name)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            啟用
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分頁控制 */}
            {total > pageSize && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  第 {currentPage + 1} 頁，共 {Math.ceil(total / pageSize)} 頁
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    aria-label="上一頁"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={(currentPage + 1) * pageSize >= total}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    aria-label="下一頁"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
