import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { topicService } from '../services/topicService'
import { sourceService } from '../services/sourceService'
import type { TopicCreate, TopicUpdate, TopicFormErrors } from '../types/topic'
import type { SourceResponse } from '../types/source'

interface TopicFormProps {
  /** 初始表單數據（用於編輯模式） */
  initialData?: Partial<TopicCreate>
  /** 是否為編輯模式 */
  isEdit?: boolean
  /** 主題 ID（編輯模式需要） */
  topicId?: string
  /** 自定義 CSS 類名 */
  className?: string
  /** 自定義提交處理器 */
  onSubmit?: (data: TopicUpdate) => Promise<void>
}

/**
 * 主題表單元件
 * 支援創建和編輯 webhook 主題，提供表單驗證和即時反饋
 */
export const TopicForm = ({
  initialData,
  isEdit = false,
  topicId,
  className = '',
  onSubmit: customOnSubmit
}: TopicFormProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<TopicCreate>({
    name: '',
    description: '',
    source_id: ''
  })
  const [sources, setSources] = useState<SourceResponse[]>([])
  const [errors, setErrors] = useState<TopicFormErrors>({})
  const [loading, setLoading] = useState(false)
  const [sourcesLoading, setSourcesLoading] = useState(true)

  // 載入來源列表
  useEffect(() => {
    const loadSources = async () => {
      try {
        const response = await sourceService.getSources({ limit: 100 })
        if (response.data) {
          // 檢查 response.data 是否為陣列（直接來源列表）或包含 items 屬性的物件
          if (Array.isArray(response.data)) {
            setSources(response.data)
          } else if (response.data.items) {
            setSources(response.data.items)
          } else {
            setSources([])
          }
        }
      } catch (err) {
        console.error('載入來源列表失敗:', err)
      } finally {
        setSourcesLoading(false)
      }
    }

    loadSources()
  }, [])

  // 初始化表單數據
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  // 表單驗證
  const validateForm = (): boolean => {
    const newErrors: TopicFormErrors = {}

    // 驗證主題名稱
    if (!formData.name.trim()) {
      newErrors.name = '主題名稱為必填項目'
    } else if (formData.name.length < 2) {
      newErrors.name = '主題名稱至少需要 2 個字符'
    }

    // 驗證來源
    if (!formData.source_id) {
      newErrors.source_id = '請選擇來源'
    }

    // 驗證描述（可選）
    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述不能超過 500 個字符'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 處理輸入變更
  const handleInputChange = (field: keyof TopicCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // 清除相關錯誤
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
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
        const response = isEdit && topicId
          ? await topicService.updateTopic(topicId, formData)
          : await topicService.createTopic(formData)

        if (response.error) {
          if (response.error?.field && response.error?.message) {
            setErrors(prev => ({ ...prev, [response.error!.field!]: response.error!.message! }))
          } else {
            alert(response.error?.message)
          }
        } else {
          alert(isEdit ? '主題更新成功' : '主題創建成功')
          navigate('/topics')
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
            {isEdit ? '編輯主題' : '新增主題'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? '修改 webhook 主題設定' : '創建新的 webhook 主題'}
          </p>
        </div>
        <button
          onClick={() => navigate('/topics')}
          className="text-gray-600 hover:text-gray-900"
        >
          返回主題列表
        </button>
      </div>

      {/* 表單 */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 主題名稱 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              主題名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="例如：push, pull_request, payment.succeeded"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              主題名稱用於識別不同類型的 webhook 事件
            </p>
          </div>

          {/* 來源選擇 */}
          <div>
            <label htmlFor="sourceId" className="block text-sm font-medium text-gray-700 mb-1">
              來源 <span className="text-red-500">*</span>
            </label>
            <select
              id="sourceId"
              value={formData.source_id}
              onChange={(e) => handleInputChange('source_id', e.target.value)}
              disabled={sourcesLoading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.source_id ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">
                {sourcesLoading ? '載入來源中...' : '選擇來源'}
              </option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            {errors.source_id && (
              <p className="mt-1 text-sm text-red-600">{errors.source_id}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              選擇此主題所屬的 webhook 來源
            </p>
          </div>

          {/* 描述 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="主題的詳細描述（可選）"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              最多 500 個字符
            </p>
          </div>

          {/* 表單操作 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/topics')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || sourcesLoading}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEdit ? '更新中...' : '創建中...') : (isEdit ? '更新主題' : '創建主題')}
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
              主題定義了 webhook 事件的類型。每個主題都屬於一個來源，並且可以有多個訂閱者接收事件。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
