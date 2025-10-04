import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { subscriptionService } from '../services/subscriptionService'
import { logService } from '../services/logService'
import type { SubscriptionResponse, SubscriptionStats } from '../types/subscription'
import type { DispatchLog } from '../types/log'

interface SubscriptionDetailProps {
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 訂閱詳情頁面元件
 * 顯示訂閱的詳細配置資訊、統計數據和交付記錄
 */
export const SubscriptionDetail = ({ className = '' }: SubscriptionDetailProps) => {
  const navigate = useNavigate()
  const { subscriptionId } = useParams<{ subscriptionId: string }>()
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null)
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入統計數據
  const loadStats = async () => {
    if (!subscriptionId) return

    setStatsLoading(true)

    try {
      const response = await subscriptionService.getSubscriptionStats(subscriptionId)

      if (response.error) {
        console.warn('載入統計數據失敗:', response.error.message)
        // 不設置錯誤，因為統計數據是可選的
      } else if (response.data) {
        setStats(response.data)
      }
    } catch (err) {
      console.warn('載入統計數據時發生錯誤:', err)
      // 不設置錯誤，因為統計數據是可選的
    } finally {
      setStatsLoading(false)
    }
  }

  // 載入交付記錄
  const loadDispatchLogs = async () => {
    if (!subscriptionId) return

    setLogsLoading(true)

    try {
      const response = await logService.getDispatchLogs({
        subscription_id: subscriptionId,
        limit: 10, // 只顯示最近10條記錄
      })

      if (response.error) {
        console.warn('載入交付記錄失敗:', response.error.message)
        // 不設置錯誤，因為交付記錄是可選的
      } else if (response.data) {
        setDispatchLogs(response.data.items)
      }
    } catch (err) {
      console.warn('載入交付記錄時發生錯誤:', err)
      // 不設置錯誤，因為交付記錄是可選的
    } finally {
      setLogsLoading(false)
    }
  }

  // 載入訂閱詳情
  const loadSubscription = async () => {
    if (!subscriptionId) {
      setError('訂閱 ID 無效')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await subscriptionService.getSubscription(subscriptionId)

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setSubscription(response.data)
        // 載入訂閱詳情成功後，載入統計數據和交付記錄
        await Promise.all([loadStats(), loadDispatchLogs()])
      }
    } catch (err) {
      setError('載入訂閱詳情失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入
  useEffect(() => {
    loadSubscription()
  }, [subscriptionId])

  // 處理停用訂閱
  const handleDeactivateSubscription = async () => {
    if (!subscription) return

    if (!confirm(`確定要停用訂閱 "${subscription.subscriber_name}" 嗎？訂閱將停止接收 webhook 事件。`)) {
      return
    }

    try {
      const response = await subscriptionService.deactivateSubscription(subscription.id)

      if (response.error) {
        alert(`停用失敗：${response.error.message}`)
      } else {
        alert('訂閱停用成功')
        loadSubscription() // 重新載入詳情
      }
    } catch (err) {
      alert('停用訂閱時發生錯誤')
    }
  }

  // 處理啟用訂閱
  const handleActivateSubscription = async () => {
    if (!subscription) return

    try {
      const response = await subscriptionService.activateSubscription(subscription.id)

      if (response.error) {
        alert(`啟用失敗：${response.error.message}`)
      } else {
        alert('訂閱啟用成功')
        loadSubscription() // 重新載入詳情
      }
    } catch (err) {
      alert('啟用訂閱時發生錯誤')
    }
  }

  // 格式化日期顯示
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 載入狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">訂閱詳情</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入訂閱詳情中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">訂閱詳情</h1>
          <button
            onClick={() => navigate('/subscriptions')}
            className="text-blue-600 hover:text-blue-900"
          >
            返回訂閱列表
          </button>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadSubscription}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 頁面標題和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/subscriptions')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">訂閱詳情</h1>
          </div>
          <p className="text-gray-600 mt-1">{subscription.subscriber_name}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate(`/subscriptions/${subscription.id}/edit`)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            編輯訂閱
          </button>
          {subscription.is_active ? (
            <button
              onClick={handleDeactivateSubscription}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              停用訂閱
            </button>
          ) : (
            <button
              onClick={handleActivateSubscription}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              啟用訂閱
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本資訊 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本資訊</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">訂閱者名稱</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.subscriber_name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">主題 ID</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                {subscription.topic_id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">目標 URL</dt>
              <dd className="mt-1 text-sm text-gray-900 break-all">
                <a
                  href={subscription.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {subscription.target_url}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">狀態</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  subscription.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.is_active ? '活躍' : '停用'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">創建時間</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(subscription.created_at)}
              </dd>
            </div>
            {subscription.updated_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">最後更新</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(subscription.updated_at)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 統計數據 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">統計數據</h2>
          {statsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">載入統計數據中...</p>
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.total_dispatches}
                  </div>
                  <div className="text-sm text-gray-600">總派發次數</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.success_rate}%
                  </div>
                  <div className="text-sm text-gray-600">成功率</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  最後活動：{stats.last_activity ? formatDate(stats.last_activity) : '無'}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-2 text-sm">尚未有統計數據</p>
            </div>
          )}
        </div>

        {/* 技術詳情 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">技術詳情</h2>
          <div className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">訂閱 ID</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                {subscription.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">訂閱狀態</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  subscription.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.is_active ? '接收中' : '已停用'}
                </span>
              </dd>
            </div>
          </div>
        </div>

        {/* 最近交付記錄 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近交付記錄</h2>
          {logsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">載入交付記錄中...</p>
            </div>
          ) : dispatchLogs.length > 0 ? (
            <div className="space-y-3">
              {dispatchLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      log.status === 'SUCCESS' ? 'bg-green-500' :
                      log.status === 'FAILED' ? 'bg-red-500' :
                      log.status === 'TIMEOUT' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {log.status === 'SUCCESS' ? '成功' :
                         log.status === 'FAILED' ? '失敗' :
                         log.status === 'TIMEOUT' ? '超時' :
                         '待處理'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(log.dispatched_at)}
                        {log.response_status_code && ` • HTTP ${log.response_status_code}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    嘗試 #{log.attempt}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm">尚未有交付記錄</p>
              <p className="text-xs text-gray-400 mt-1">
                當有 webhook 事件發送到此訂閱時，這裡將顯示交付歷史
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 相關操作 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">相關操作</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/topics/${subscription.topic_id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            查看主題詳情
          </button>
          <button
            onClick={() => navigate(`/logs?subscription=${subscription.id}`)}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            查看相關日誌
          </button>
          <button
            onClick={() => navigate('/subscriptions')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            返回訂閱列表
          </button>
        </div>
      </div>

      {/* 說明資訊 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              此頁面顯示訂閱的詳細配置資訊和統計數據。您可以編輯訂閱設定、啟用或停用訂閱，或查看相關的 webhook 事件日誌。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
