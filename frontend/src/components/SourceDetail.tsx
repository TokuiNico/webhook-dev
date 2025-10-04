import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sourceService } from '../services/sourceService'
import type { SourceResponse } from '../types/source'

interface SourceDetailProps {
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 來源詳情頁面元件
 * 顯示來源的詳細配置資訊、統計數據和相關操作
 */
export const SourceDetail = ({ className = '' }: SourceDetailProps) => {
  const navigate = useNavigate()
  const { sourceId } = useParams<{ sourceId: string }>()
  const [source, setSource] = useState<SourceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 載入來源詳情
  const loadSource = async () => {
    if (!sourceId) {
      setError('來源 ID 無效')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await sourceService.getSource(sourceId)

      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setSource(response.data)
      }
    } catch (err) {
      setError('載入來源詳情失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入
  useEffect(() => {
    loadSource()
  }, [sourceId])

  // 處理刪除來源
  const handleDeleteSource = async () => {
    if (!source) return

    if (!confirm(`確定要刪除來源 "${source.name}" 嗎？此操作無法復原。`)) {
      return
    }

    try {
      const response = await sourceService.deleteSource(source.id)

      if (response.error) {
        alert(`刪除失敗：${response.error.message}`)
      } else {
        alert('來源刪除成功')
        navigate('/sources')
      }
    } catch (err) {
      alert('刪除來源時發生錯誤')
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
          <h1 className="text-2xl font-bold text-gray-900">來源詳情</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入來源詳情中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">來源詳情</h1>
          <button
            onClick={() => navigate('/sources')}
            className="text-blue-600 hover:text-blue-900"
          >
            返回來源列表
          </button>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadSource}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  if (!source) {
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 頁面標題和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/sources')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">來源詳情</h1>
          </div>
          <p className="text-gray-600 mt-1">{source.name}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate(`/sources/${source.id}/edit`)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            編輯來源
          </button>
          <button
            onClick={handleDeleteSource}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            刪除來源
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本資訊 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本資訊</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">來源名稱</dt>
              <dd className="mt-1 text-sm text-gray-900">{source.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">認證類型</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  source.auth_type === 'signature'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {source.auth_type === 'signature' ? '簽名驗證' : '無驗證'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">創建時間</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDate(source.created_at)}
              </dd>
            </div>
            {source.updated_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">最後更新</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(source.updated_at)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* 認證配置 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">認證配置</h2>
          {source.auth_type === 'signature' && source.auth_config ? (
            <dl className="space-y-3">
              {Object.entries(source.auth_config).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-sm font-medium text-gray-500 capitalize">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-gray-600">此來源不需要認證配置</p>
          )}
        </div>

        {/* 統計數據 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">統計數據</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                -
              </div>
              <div className="text-sm text-gray-600">Webhook 數量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                -
              </div>
              <div className="text-sm text-gray-600">主題數量</div>
            </div>
          </div>
          {source.created_at && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                創建時間：{formatDate(source.created_at)}
              </div>
            </div>
          )}
        </div>

        {/* 技術詳情 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">技術詳情</h2>
          <div className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">來源 ID</dt>
              <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                {source.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">狀態</dt>
              <dd className="mt-1">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  活躍
                </span>
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* 相關操作 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">相關操作</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`/topics?source=${source.id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            查看相關主題
          </button>
          <button
            onClick={() => navigate(`/subscriptions?source=${source.id}`)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            查看相關訂閱
          </button>
          <button
            onClick={() => navigate(`/logs?source=${source.id}`)}
            className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            查看相關日誌
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
              此頁面顯示來源的詳細配置資訊和統計數據。您可以編輯來源設定、查看相關資源，或執行刪除操作。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
