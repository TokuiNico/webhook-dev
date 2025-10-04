import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sourceService } from '../services/sourceService'
import { SourceForm } from './SourceForm'
import { useAuth } from '../hooks/useAuth'
import type { SourceResponse, SourceUpdate } from '../types/source'

/**
 * 來源編輯頁面元件
 * 載入現有來源資料並允許用戶編輯
 */
export const SourceEdit = () => {
  const navigate = useNavigate()
  const { sourceId } = useParams<{ sourceId: string }>()
  const { isAuthenticated } = useAuth()
  const [source, setSource] = useState<SourceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 檢查登入狀態
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
  }, [isAuthenticated, navigate])

  // 載入來源資料
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
      setError('載入來源資料失敗')
    } finally {
      setLoading(false)
    }
  }

  // 初始化載入
  useEffect(() => {
    if (isAuthenticated) {
      loadSource()
    }
  }, [sourceId, isAuthenticated])

  // 處理編輯提交
  const handleEdit = async (updateData: SourceUpdate) => {
    if (!sourceId || !source) return

    try {
      const response = await sourceService.updateSource(sourceId, updateData)

      if (response.error) {
        if (response.error.field && response.error.message) {
          throw new Error(`${response.error.field}: ${response.error.message}`)
        } else {
          throw new Error(response.error.message)
        }
      } else {
        alert('來源更新成功')
        navigate(`/sources/${sourceId}`)
      }
    } catch (err) {
      alert(`更新失敗：${err instanceof Error ? err.message : '未知錯誤'}`)
    }
  }

  // 載入狀態
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">編輯來源</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入來源資料中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">編輯來源</h1>
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
    <SourceForm
      initialData={source}
      isEdit={true}
      sourceId={sourceId}
      onSubmit={handleEdit}
    />
  )
}
