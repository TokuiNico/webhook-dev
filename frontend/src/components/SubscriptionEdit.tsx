import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SubscriptionForm } from './SubscriptionForm'
import { subscriptionService } from '../services/subscriptionService'
import type { SubscriptionResponse } from '../types/subscription'

interface SubscriptionEditProps {
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 訂閱編輯頁面元件
 * 載入現有訂閱數據並使用表單元件進行編輯
 */
export const SubscriptionEdit = ({ className = '' }: SubscriptionEditProps) => {
  const navigate = useNavigate()
  const { subscriptionId } = useParams<{ subscriptionId: string }>()
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 載入訂閱數據
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
      }
    } catch (err) {
      setError('載入訂閱數據失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入
  useEffect(() => {
    loadSubscription()
  }, [subscriptionId])

  // 處理表單提交
  const handleSubmit = async (updateData: any) => {
    if (!subscriptionId) return

    const response = await subscriptionService.updateSubscription(subscriptionId, updateData)

    if (response.error) {
      throw new Error(response.error.message)
    } else {
      alert('訂閱更新成功')
      navigate('/subscriptions')
    }
  }

  // 載入狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">編輯訂閱</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入訂閱數據中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">編輯訂閱</h1>
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

  // 將訂閱數據轉換為表單格式
  const formData = {
    topic_id: subscription.topic_id,
    subscriber_name: subscription.subscriber_name,
    target_url: subscription.target_url,
    is_active: subscription.is_active
  }

  return (
    <SubscriptionForm
      initialData={formData}
      isEdit={true}
      subscriptionId={subscriptionId}
      className={className}
      onSubmit={handleSubmit}
    />
  )
}
