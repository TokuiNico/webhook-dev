import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { topicService } from '../services/topicService'
import { sourceService } from '../services/sourceService'
import { statsService } from '../services/statsService'
import type { TopicResponse, WebhookTestResponse } from '../types/topic'
import type { SourceResponse } from '../types/source'

/**
 * 主題詳情頁面元件
 * 顯示主題的詳細信息、統計數據和相關操作
 */
export const TopicDetail = () => {
  const { topicId } = useParams<{ topicId: string }>()
  const navigate = useNavigate()
  const [topic, setTopic] = useState<TopicResponse | null>(null)
  const [source, setSource] = useState<SourceResponse | null>(null)
  const [stats, setStats] = useState<{
    webhook_count: number
    subscriber_count: number
    last_activity: string | null
  } | null>(null)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)
  const [subscribersLoading, setSubscribersLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Webhook 測試工具狀態
  const [testExpanded, setTestExpanded] = useState(false)
  const [testPayload, setTestPayload] = useState('{\n  "event": "test",\n  "data": "test data"\n}')
  const [testContentType, setTestContentType] = useState('application/json')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<WebhookTestResponse | null>(null)

  // 載入主題和來源數據
  useEffect(() => {
    const loadData = async () => {
      if (!topicId) return

      setLoading(true)
      setError(null)

      try {
        // 載入主題詳情
        const topicResponse = await topicService.getTopic(topicId)
        if (topicResponse.error) {
          setError(topicResponse.error.message)
          return
        }

        const topicData = topicResponse.data
        if (!topicData) {
          setError('主題不存在')
          return
        }

        setTopic(topicData)

        // 載入來源信息
        const sourceResponse = await sourceService.getSource(topicData.source_id)
        if (sourceResponse.data) {
          setSource(sourceResponse.data)
        }

        // 載入統計數據
        const statsResponse = await statsService.getTopicStats(topicId)
        if (statsResponse.data) {
          setStats(statsResponse.data)
        }

        // 載入 webhooks
        setWebhooksLoading(true)
        const webhooksResponse = await topicService.getTopicWebhooks(topicId, { limit: 5 })
        if (webhooksResponse.data) {
          setWebhooks(webhooksResponse.data.webhooks || [])
        }
        setWebhooksLoading(false)

        // 載入 subscribers
        setSubscribersLoading(true)
        const subscribersResponse = await topicService.getTopicSubscribers(topicId, { limit: 5 })
        if (subscribersResponse.data) {
          setSubscribers(subscribersResponse.data.subscribers || [])
        }
        setSubscribersLoading(false)
      } catch (err) {
        setError('載入主題詳情失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [topicId])

  // 處理刪除主題
  const handleDeleteTopic = async () => {
    if (!topic) return

    if (!confirm(`確定要刪除主題 "${topic.name}" 嗎？此操作無法復原。`)) {
      return
    }

    try {
      const response = await topicService.deleteTopic(topic.id)

      if (response.error) {
        alert(`刪除失敗：${response.error.message}`)
      } else {
        alert('主題刪除成功')
        navigate('/topics')
      }
    } catch (err) {
      alert('刪除主題時發生錯誤')
    }
  }

  // 處理 webhook 測試
  const handleTestWebhook = async () => {
    if (!topicId || !testPayload.trim()) {
      alert('請輸入測試 payload')
      return
    }

    setTestLoading(true)
    setTestResult(null)

    try {
      const testRequest = {
        payload: testPayload,
        content_type: testContentType,
      }

      const response = await topicService.testWebhook(topicId, testRequest)

      if (response.error) {
        setTestResult({
          success: false,
          message: response.error.message || '測試失敗',
          error: response.error.message,
        })
      } else if (response.data) {
        setTestResult(response.data)
        // 如果成功，重新載入 webhooks 列表
        if (response.data.success) {
          const webhooksResponse = await topicService.getTopicWebhooks(topicId, { limit: 5 })
          if (webhooksResponse.data) {
            setWebhooks(webhooksResponse.data.webhooks || [])
          }
        }
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: '測試時發生錯誤',
        error: err instanceof Error ? err.message : '未知錯誤',
      })
    } finally {
      setTestLoading(false)
    }
  }

  // 載入狀態
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">主題詳情</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入主題詳情中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">主題詳情</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/topics')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            返回主題列表
          </button>
        </div>
      </div>
    )
  }

  // 數據不存在
  if (!topic) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">主題詳情</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.966-5.618-2.479A8.005 8.005 0 0120 12c0 2.34-.966 4.29-2.479 5.618A7.962 7.962 0 0112 21a7.962 7.962 0 01-5.618-2.382A8.005 8.005 0 014 12a8.005 8.005 0 015.382-7.382A7.962 7.962 0 0112 3c2.34 0 4.29.966 5.618 2.479A8.005 8.005 0 0120 12c-.291-1.163-.756-2.243-1.382-3.209L14 9l-2-7" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">主題不存在</h3>
          <p className="mt-2 text-gray-600">找不到指定的主題</p>
          <button
            onClick={() => navigate('/topics')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            返回主題列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
          <p className="text-gray-600 mt-1">主題詳情和統計信息</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate(`/topics/${topic.id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            編輯主題
          </button>
          <button
            onClick={handleDeleteTopic}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            刪除主題
          </button>
          <button
            onClick={() => navigate('/topics')}
            className="text-gray-600 hover:text-gray-900"
          >
            返回列表
          </button>
        </div>
      </div>

      {/* 主題信息卡片 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">基本信息</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">主題名稱</dt>
              <dd className="mt-1 text-sm text-gray-900">{topic.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">來源</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {source ? source.name : `ID: ${topic.source_id}`}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Ingest URL</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <button
                  onClick={() => navigator.clipboard.writeText(topic.ingest_url)}
                  className="font-mono text-blue-600 hover:text-blue-800 underline text-xs"
                  title={topic.ingest_url}
                >
                  點擊複製
                </button>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">創建時間</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(topic.created_at).toLocaleString('zh-TW')}
              </dd>
            </div>
            {topic.updated_at !== topic.created_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">最後更新</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(topic.updated_at).toLocaleString('zh-TW')}
                </dd>
              </div>
            )}
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">描述</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {topic.description || '無描述'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 統計信息卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Webhook 數量</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {stats ? stats.webhook_count : '-'}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">訂閱者數量</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {stats ? stats.subscriber_count : '-'}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">最後活動</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {stats?.last_activity ? new Date(stats.last_activity).toLocaleString('zh-TW') : '無活動'}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook 列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近的 Webhook</h2>
            <button
              onClick={() => navigate('/logs')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              查看全部
            </button>
          </div>
        </div>
        <div className="p-6">
          {webhooksLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">載入中...</p>
            </div>
          ) : webhooks.length > 0 ? (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      webhook.status === 'RECEIVED' ? 'bg-blue-500' :
                      webhook.status === 'QUEUED' ? 'bg-yellow-500' :
                      webhook.status === 'FAILED_VALIDATION' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        來自 {webhook.source_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(webhook.received_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    webhook.status === 'RECEIVED' ? 'bg-blue-100 text-blue-800' :
                    webhook.status === 'QUEUED' ? 'bg-yellow-100 text-yellow-800' :
                    webhook.status === 'FAILED_VALIDATION' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {webhook.status === 'RECEIVED' ? '已接收' :
                     webhook.status === 'QUEUED' ? '已排隊' :
                     webhook.status === 'FAILED_VALIDATION' ? '驗證失敗' : webhook.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">尚未收到 Webhook</h3>
              <p className="mt-2 text-gray-600">當有 webhook 發送到此主題時，它們會顯示在這裡</p>
            </div>
          )}
        </div>
      </div>

      {/* 訂閱者列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">訂閱者</h2>
            <button
              onClick={() => navigate('/subscriptions')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              查看全部
            </button>
          </div>
        </div>
        <div className="p-6">
          {subscribersLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">載入中...</p>
            </div>
          ) : subscribers.length > 0 ? (
            <div className="space-y-4">
              {subscribers.map((subscriber) => (
                <div key={subscriber.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      subscriber.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {subscriber.subscriber_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {subscriber.target_url}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    subscriber.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {subscriber.is_active ? '啟用' : '停用'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">沒有訂閱者</h3>
              <p className="mt-2 text-gray-600">此主題目前沒有訂閱者</p>
            </div>
          )}
        </div>
      </div>

      {/* Webhook 測試工具 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">測試 Webhook</h2>
          <button
            onClick={() => setTestExpanded(!testExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {testExpanded ? '收起' : '展開'}
          </button>
        </div>

        {testExpanded && (
          <div className="space-y-4">
            {/* Content-Type 選擇 */}
            <div>
              <label htmlFor="testContentType" className="block text-sm font-medium text-gray-700 mb-1">
                Content-Type
              </label>
              <select
                id="testContentType"
                value={testContentType}
                onChange={(e) => setTestContentType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="application/json">application/json</option>
                <option value="application/xml">application/xml</option>
                <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
              </select>
            </div>

            {/* Payload 輸入 */}
            <div>
              <label htmlFor="testPayload" className="block text-sm font-medium text-gray-700 mb-1">
                Payload
              </label>
              <textarea
                id="testPayload"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='輸入測試 payload，例如：{"event": "test", "data": "test data"}'
              />
            </div>

            {/* 測試按鈕 */}
            <div className="flex justify-end">
              <button
                onClick={handleTestWebhook}
                disabled={testLoading || !testPayload.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testLoading ? '測試中...' : '發送測試'}
              </button>
            </div>

            {/* 測試結果 */}
            {testResult && (
              <div className={`p-4 rounded-md ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {testResult.success ? (
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.success ? '測試成功' : '測試失敗'}
                    </p>
                    <p className={`mt-1 text-sm ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.error && (
                      <p className="mt-1 text-xs text-red-600 font-mono">
                        {testResult.error}
                      </p>
                    )}
                    {testResult.event_log_id && (
                      <p className="mt-1 text-xs text-gray-600">
                        事件 ID: {testResult.event_log_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
              Ingest URL 是接收 webhook 的端點。將此 URL 配置到外部服務中以開始接收事件。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
