import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { topicService } from '../services/topicService'
import { TopicForm } from './TopicForm'
import { useAuth } from '../hooks/useAuth'
import type { TopicResponse } from '../types/topic'

/**
 * 主題編輯頁面元件
 * 載入現有主題數據並提供編輯功能
 */
export const TopicEdit = () => {
  const { topicId } = useParams<{ topicId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [topic, setTopic] = useState<TopicResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 檢查登入狀態
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
  }, [isAuthenticated, navigate])

  // 載入主題數據
  useEffect(() => {
    if (!isAuthenticated) return

    const loadTopic = async () => {
      if (!topicId) return

      setLoading(true)
      setError(null)

      try {
        const response = await topicService.getTopic(topicId)

        if (response.error) {
          setError(response.error.message)
        } else if (response.data) {
          setTopic(response.data)
        }
      } catch (err) {
        setError('載入主題失敗')
      } finally {
        setLoading(false)
      }
    }

    loadTopic()
  }, [topicId, isAuthenticated])

  // 載入狀態
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">編輯主題</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入主題數據中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">編輯主題</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">編輯主題</h1>
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
    <TopicForm
      initialData={{
        name: topic.name,
        description: topic.description,
        source_id: topic.source_id
      }}
      isEdit={true}
      topicId={topicId}
    />
  )
}
