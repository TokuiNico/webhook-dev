import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { topicService } from '../services/topicService'
import type { TopicResponse, TopicFilterParams } from '../types/topic'

interface TopicListProps {
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 主題列表頁面元件
 * 按來源分組顯示所有 webhook 主題，提供篩選和管理功能
 */
export const TopicList = ({ className = '' }: TopicListProps) => {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<TopicResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  // 篩選條件
  const [filters, setFilters] = useState<TopicFilterParams>({
    skip: 0,
    limit: 50 // 顯示更多主題
  })

  // 按來源分組的主題
  const groupedTopics = (topics || []).reduce((groups, topic) => {
    const sourceId = topic.source_id
    if (!groups[sourceId]) {
      groups[sourceId] = []
    }
    groups[sourceId].push(topic)
    return groups
  }, {} as Record<string, TopicResponse[]>)

  // 載入主題列表
  const loadTopics = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await topicService.getTopics(filters)

      if (response.error) {
        setError(response.error.message)
        setTopics([]) // 確保在錯誤時也設置為空數組
      } else if (response.data) {
        // 檢查 response.data 是否為陣列（直接主題列表）或包含 items 屬性的物件
        if (Array.isArray(response.data)) {
          setTopics(response.data)
          setTotal(response.data.length)
        } else if (response.data.items) {
          setTopics(response.data.items)
          setTotal(response.data.total || 0)
        } else {
          setTopics([]) // 確保即使數據結構不正確也設置為空數組
        }
      } else {
        setTopics([]) // 確保即使數據結構不正確也設置為空數組
      }
    } catch (err) {
      setError('載入主題列表失敗')
      setTopics([]) // 確保在異常時也設置為空數組
    } finally {
      setLoading(false)
    }
  }

  // 初始載入和篩選變更時重新載入
  useEffect(() => {
    loadTopics()
  }, [filters])

  // 處理來源篩選
  const handleSourceFilter = (sourceId: string) => {
    setFilters(prev => ({
      ...prev,
      source_id: sourceId || undefined,
      skip: 0 // 重置到第一頁
    }))
  }

  // 載入狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">主題管理</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入主題列表中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">主題管理</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadTopics}
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
          <h1 className="text-2xl font-bold text-gray-900">主題管理</h1>
          <p className="text-gray-600">管理 webhook 主題和事件類型</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">共 {total} 個主題</p>
          </div>
          <button
            onClick={() => navigate('/topics/create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            新增主題
          </button>
        </div>
      </div>

      {(!topics || topics.length === 0) ? (
        /* 空狀態 */
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">尚未建立任何主題</h3>
          <p className="mt-2 text-gray-600">創建第一個主題來開始接收 webhook 事件</p>
          <button
            onClick={() => navigate('/topics/create')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            創建第一個主題
          </button>
        </div>
      ) : (
        /* 主題分組列表 */
        <div className="space-y-6">
          {Object.entries(groupedTopics).map(([sourceId, sourceTopics]) => {
            const firstTopic = sourceTopics[0]
            const sourceName = firstTopic?.source_id || '未知來源'

            return (
              <div key={sourceId} className="bg-white shadow rounded-lg overflow-hidden">
                {/* 來源標頭 */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h2 className="text-lg font-semibold text-gray-900">{sourceName}</h2>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {sourceTopics.length} 個主題
                      </span>
                    </div>
                    <button
                      onClick={() => handleSourceFilter(sourceId)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      查看全部
                    </button>
                  </div>
                </div>

                {/* 主題卡片網格 */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sourceTopics.map((topic) => (
                      <div key={topic.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {topic.name}
                          </h3>
                          <div className="flex space-x-2 ml-2">
                            <button
                              onClick={() => navigate(`/topics/${topic.id}`)}
                              className="text-blue-600 hover:text-blue-900 text-xs"
                              title="檢視詳情"
                            >
                              檢視
                            </button>
                            <button
                              onClick={() => navigate(`/topics/${topic.id}/edit`)}
                              className="text-green-600 hover:text-green-900 text-xs"
                              title="編輯主題"
                            >
                              編輯
                            </button>
                          </div>
                        </div>

                        {topic.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {topic.description}
                          </p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Webhook 數量:</span>
                            <span className="font-medium text-blue-600">-</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">訂閱數量:</span>
                            <span className="font-medium text-green-600">-</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Ingest URL:</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(topic.ingest_url)}
                              className="font-mono text-xs text-blue-600 hover:text-blue-800 truncate max-w-32"
                              title={topic.ingest_url}
                            >
                              複製
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            建立於 {new Date(topic.created_at).toLocaleDateString('zh-TW')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
              主題定義了 webhook 事件的類型（如 github.push、stripe.payment.succeeded）。每個主題都屬於一個來源，並且可以有多個訂閱者接收事件。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
