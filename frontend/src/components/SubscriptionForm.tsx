import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionService } from '../services/subscriptionService'
import { topicService } from '../services/topicService'
import type {
  SubscriptionCreate,
  SubscriptionUpdate,
  SubscriptionFormErrors
} from '../types/subscription'
import type { TopicResponse } from '../types/topic'

interface SubscriptionFormProps {
  /** 初始表單數據（用於編輯模式） */
  initialData?: Partial<SubscriptionCreate>
  /** 是否為編輯模式 */
  isEdit?: boolean
  /** 訂閱 ID（編輯模式需要） */
  subscriptionId?: string
  /** 自定義 CSS 類名 */
  className?: string
  /** 自定義提交處理器 */
  onSubmit?: (data: SubscriptionUpdate) => Promise<void>
}

/**
 * 訂閱表單元件
 * 支援創建和編輯 webhook 訂閱，提供表單驗證和即時反饋
 */
export const SubscriptionForm = ({
  initialData,
  isEdit = false,
  subscriptionId,
  className = '',
  onSubmit: customOnSubmit
}: SubscriptionFormProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<SubscriptionCreate>({
    topic_id: '',
    subscriber_name: '',
    target_url: '',
    is_active: true
  })
  const [errors, setErrors] = useState<SubscriptionFormErrors>({})
  const [loading, setLoading] = useState(false)
  const [topics, setTopics] = useState<TopicResponse[]>([])
  const [topicsLoading, setTopicsLoading] = useState(true)

  // 初始化表單數據
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  // 載入主題列表
  useEffect(() => {
    const loadTopics = async () => {
      try {
        const response = await topicService.getTopics()
        if (response.data) {
          setTopics(response.data.items)
        }
      } catch (err) {
        console.error('載入主題列表失敗:', err)
      } finally {
        setTopicsLoading(false)
      }
    }

    loadTopics()
  }, [])

  // 表單驗證
  const validateForm = (): boolean => {
    const newErrors: SubscriptionFormErrors = {}

    // 驗證主題 ID
    if (!formData.topic_id) {
      newErrors.topic_id = '主題為必選項目'
    }

    // 驗證訂閱者名稱
    if (!formData.subscriber_name.trim()) {
      newErrors.subscriber_name = '訂閱者名稱為必填項目'
    } else if (formData.subscriber_name.length < 2) {
      newErrors.subscriber_name = '訂閱者名稱至少需要 2 個字符'
    }

    // 驗證目標 URL
    if (!formData.target_url) {
      newErrors.target_url = '目標 URL 為必填項目'
    } else {
      try {
        new URL(formData.target_url)
      } catch {
        newErrors.target_url = '請輸入有效的 URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 處理輸入變更
  const handleInputChange = (field: keyof SubscriptionCreate, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // 清除相關錯誤
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // 處理主題選擇
  const handleTopicChange = (topicId: string) => {
    setFormData(prev => ({ ...prev, topic_id: topicId }))

    if (errors.topic_id) {
      setErrors(prev => ({ ...prev, topic_id: undefined }))
    }
  }

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      if (customOnSubmit) {
        // 使用自定義提交處理器
        await customOnSubmit(formData)
      } else {
        // 使用預設的提交邏輯
        const response = isEdit && subscriptionId
          ? await subscriptionService.updateSubscription(subscriptionId, formData)
          : await subscriptionService.createSubscription(formData)

        if (response.error) {
          if (response.error.field && response.error.message) {
            setErrors(prev => ({ ...prev, [response.error.field!]: response.error.message }))
          } else {
            alert(response.error.message || '操作失敗')
          }
        } else {
          alert(isEdit ? '訂閱更新成功' : '訂閱創建成功')
          navigate('/subscriptions')
        }
      }
    } catch (err) {
      alert('操作失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? '編輯訂閱' : '新增訂閱'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? '修改 webhook 訂閱設定' : '創建新的 webhook 訂閱'}
          </p>
        </div>
        <button
          onClick={() => navigate('/subscriptions')}
          className="text-gray-600 hover:text-gray-900"
        >
          返回訂閱列表
        </button>
      </div>

      {/* 表單 */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 主題選擇 */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
              主題 <span className="text-red-500">*</span>
            </label>
            {topicsLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">載入主題列表中...</span>
              </div>
            ) : (
              <select
                id="topic"
                value={formData.topic_id}
                onChange={(e) => handleTopicChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.topic_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">選擇主題</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name} - {topic.description || '無描述'}
                  </option>
                ))}
              </select>
            )}
            {errors.topic_id && (
              <p className="mt-1 text-sm text-red-600">{errors.topic_id}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              選擇要訂閱的主題，當該主題有新的 webhook 事件時，您將收到通知
            </p>
          </div>

          {/* 訂閱者名稱 */}
          <div>
            <label htmlFor="subscriberName" className="block text-sm font-medium text-gray-700 mb-1">
              訂閱者名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subscriberName"
              value={formData.subscriber_name}
              onChange={(e) => handleInputChange('subscriber_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.subscriber_name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="例如：my-service、notification-handler"
            />
            {errors.subscriber_name && (
              <p className="mt-1 text-sm text-red-600">{errors.subscriber_name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              用於識別此訂閱的唯一名稱，便於管理和追蹤
            </p>
          </div>

          {/* 目標 URL */}
          <div>
            <label htmlFor="targetUrl" className="block text-sm font-medium text-gray-700 mb-1">
              目標 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="targetUrl"
              value={formData.target_url}
              onChange={(e) => handleInputChange('target_url', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.target_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="https://your-service.com/webhook"
            />
            {errors.target_url && (
              <p className="mt-1 text-sm text-red-600">{errors.target_url}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              webhook 事件將被發送到此 URL。請確保您的服務可以處理 POST 請求
            </p>
          </div>

          {/* 活躍狀態 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              訂閱狀態
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                啟用此訂閱
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.is_active
                ? '訂閱將立即開始接收 webhook 事件'
                : '訂閱將被創建但不會接收事件，可以稍後啟用'
              }
            </p>
          </div>

          {/* 表單操作 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/subscriptions')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || topicsLoading}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEdit ? '更新中...' : '創建中...') : (isEdit ? '更新訂閱' : '創建訂閱')}
            </button>
          </div>
        </form>
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
              訂閱允許您的服務接收特定主題的 webhook 事件。請確保目標 URL 可以正確處理 webhook 請求，並實現適當的安全驗證。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
