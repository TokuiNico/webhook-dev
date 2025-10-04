import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sourceService } from '../services/sourceService'
import type { SourceCreate, AuthType, SourceFormErrors } from '../types/source'

interface SourceFormProps {
  /** 初始表單數據（用於編輯模式） */
  initialData?: Partial<SourceCreate>
  /** 是否為編輯模式 */
  isEdit?: boolean
  /** 來源 ID（編輯模式需要） */
  sourceId?: string
  /** 自定義 CSS 類名 */
  className?: string
  /** 自定義提交處理器 */
  onSubmit?: (data: SourceUpdate) => Promise<void>
}

/**
 * 來源表單元件
 * 支援創建和編輯 webhook 來源，提供表單驗證和即時反饋
 */
export const SourceForm = ({
  initialData,
  isEdit = false,
  sourceId,
  className = '',
  onSubmit: customOnSubmit
}: SourceFormProps) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<SourceCreate>({
    name: '',
    secret: '',
    auth_type: 'none',
    auth_config: {}
  })
  const [errors, setErrors] = useState<SourceFormErrors>({})
  const [loading, setLoading] = useState(false)
  const [nameAvailability, setNameAvailability] = useState<{
    checking: boolean
    available?: boolean
  }>({ checking: false })

  // 初始化表單數據
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  // 表單驗證
  const validateForm = (): boolean => {
    const newErrors: SourceFormErrors = {}

    // 驗證來源名稱
    if (!formData.name.trim()) {
      newErrors.name = '來源名稱為必填項目'
    } else if (!/^[a-z0-9-]+$/.test(formData.name)) {
      newErrors.name = '來源名稱只能包含小寫字母、數字和連字號'
    } else if (formData.name.length < 3) {
      newErrors.name = '來源名稱至少需要 3 個字符'
    }

    // 驗證認證密鑰
    if (!formData.secret) {
      newErrors.secret = '認證密鑰為必填項目'
    } else if (formData.secret.length < 8) {
      newErrors.secret = '認證密鑰至少需要 8 個字符'
    }

    // 驗證認證配置（當選擇簽名驗證時）
    if (formData.auth_type === 'signature') {
      if (!formData.auth_config?.signature_header) {
        newErrors.auth_config = '簽名標頭為必填項目'
      }
      if (!formData.auth_config?.algorithm) {
        if (!newErrors.auth_config) newErrors.auth_config = '演算法為必填項目'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 處理輸入變更
  const handleInputChange = (field: keyof SourceCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // 清除相關錯誤
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // 檢查名稱可用性
    if (field === 'name' && value && value !== initialData?.name) {
      checkNameAvailability(value)
    }
  }

  // 檢查名稱可用性
  const checkNameAvailability = async (name: string) => {
    if (!name || name === initialData?.name) return

    setNameAvailability({ checking: true })

    try {
      const response = await sourceService.checkSourceNameAvailability(name)

      if (response.error) {
        setNameAvailability({ checking: false, available: false })
      } else {
        setNameAvailability({ checking: false, available: response.data?.available })
      }
    } catch (err) {
      setNameAvailability({ checking: false, available: false })
    }
  }

  // 處理認證類型變更
  const handleAuthTypeChange = (authType: AuthType) => {
    setFormData(prev => ({
      ...prev,
      auth_type: authType,
      auth_config: authType === 'none' ? {} : prev.auth_config
    }))

    if (errors.auth_config) {
      setErrors(prev => ({ ...prev, auth_config: undefined }))
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
        const response = isEdit && sourceId
          ? await sourceService.updateSource(sourceId, formData)
          : await sourceService.createSource(formData)

        if (response.error) {
          if (response.error.field && response.error.message) {
            setErrors(prev => ({ ...prev, [response.error.field!]: response.error.message }))
          } else {
            alert(response.error.message)
          }
        } else {
          alert(isEdit ? '來源更新成功' : '來源創建成功')
          navigate('/sources')
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
            {isEdit ? '編輯來源' : '新增來源'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? '修改 webhook 來源設定' : '創建新的 webhook 來源'}
          </p>
        </div>
        <button
          onClick={() => navigate('/sources')}
          className="text-gray-600 hover:text-gray-900"
        >
          返回來源列表
        </button>
      </div>

      {/* 表單 */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 來源名稱 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              來源名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={(e) => e.target.value && checkNameAvailability(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="例如：github、stripe、slack"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
            {nameAvailability.checking && (
              <p className="mt-1 text-sm text-gray-600">檢查名稱可用性中...</p>
            )}
            {nameAvailability.available === false && !nameAvailability.checking && (
              <p className="mt-1 text-sm text-red-600">此來源名稱已被使用</p>
            )}
            {nameAvailability.available === true && !nameAvailability.checking && (
              <p className="mt-1 text-sm text-green-600">✓ 來源名稱可用</p>
            )}
          </div>

          {/* 認證密鑰 */}
          <div>
            <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-1">
              認證密鑰 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="secret"
              value={formData.secret}
              onChange={(e) => handleInputChange('secret', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.secret ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="用於驗證 webhook 真實性的密鑰"
            />
            {errors.secret && (
              <p className="mt-1 text-sm text-red-600">{errors.secret}</p>
            )}
          </div>

          {/* 認證類型 */}
          <div>
            <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1">
              認證類型
            </label>
            <select
              id="authType"
              value={formData.auth_type}
              onChange={(e) => handleAuthTypeChange(e.target.value as AuthType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">無驗證</option>
              <option value="signature">簽名驗證</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {formData.auth_type === 'none'
                ? '不驗證 webhook 真實性，適合開發測試環境'
                : '驗證 webhook 的 HMAC 簽名，確保請求來自可信來源'
              }
            </p>
          </div>

          {/* 簽名驗證配置 */}
          {formData.auth_type === 'signature' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-900">簽名驗證配置</h3>

              {/* 簽名標頭 */}
              <div>
                <label htmlFor="signatureHeader" className="block text-sm font-medium text-gray-700 mb-1">
                  簽名標頭 <span className="text-red-500">*</span>
                </label>
                <select
                  id="signatureHeader"
                  value={formData.auth_config?.signature_header || ''}
                  onChange={(e) => handleInputChange('auth_config', {
                    ...formData.auth_config,
                    signature_header: e.target.value
                  })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.auth_config ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">選擇簽名標頭</option>
                  <option value="X-Hub-Signature-256">GitHub (X-Hub-Signature-256)</option>
                  <option value="Stripe-Signature">Stripe (Stripe-Signature)</option>
                  <option value="X-Webhook-Signature">通用 (X-Webhook-Signature)</option>
                </select>
                {errors.auth_config && (
                  <p className="mt-1 text-sm text-red-600">{errors.auth_config}</p>
                )}
              </div>

              {/* 演算法 */}
              <div>
                <label htmlFor="algorithm" className="block text-sm font-medium text-gray-700 mb-1">
                  演算法 <span className="text-red-500">*</span>
                </label>
                <select
                  id="algorithm"
                  value={formData.auth_config?.algorithm || ''}
                  onChange={(e) => handleInputChange('auth_config', {
                    ...formData.auth_config,
                    algorithm: e.target.value
                  })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.auth_config ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">選擇演算法</option>
                  <option value="sha256">SHA-256</option>
                  <option value="sha1">SHA-1</option>
                </select>
              </div>
            </div>
          )}

          {/* 表單操作 */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/sources')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEdit ? '更新中...' : '創建中...') : (isEdit ? '更新來源' : '創建來源')}
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
              來源是 webhook 的發送者（如 GitHub、Stripe 等）。為每個來源設定適當的認證方式可以確保 webhook 的安全性。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
