import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sourceService } from '../services/sourceService'
import type { SourceResponse, SourceFilterParams, AuthType } from '../types/source'

interface SourceListProps {
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 來源列表頁面元件
 * 顯示所有 webhook 來源，提供搜尋、篩選、分頁等功能
 */
export const SourceList = ({ className = '' }: SourceListProps) => {
  const navigate = useNavigate()
  const [sources, setSources] = useState<SourceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)

  // 篩選條件
  const [filters, setFilters] = useState<SourceFilterParams>({
    skip: 0,
    limit: pageSize
  })

  // 載入來源列表
  const loadSources = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await sourceService.getSources(filters)

      if (response.error) {
        setError(response.error.message)
        setSources([]) // 確保在錯誤時也設置為空數組
      } else if (response.data) {
        // 檢查 response.data 是否為陣列（直接來源列表）或包含 items 屬性的物件
        if (Array.isArray(response.data)) {
          setSources(response.data)
          setTotal(response.data.length)
        } else if (response.data.items) {
          setSources(response.data.items)
          setTotal(response.data.total || 0)
        } else {
          setSources([]) // 確保即使數據結構不正確也設置為空數組
        }
      } else {
        setSources([]) // 確保即使數據結構不正確也設置為空數組
      }
    } catch (err) {
      setError('載入來源列表失敗')
      setSources([]) // 確保在異常時也設置為空數組
    } finally {
      setLoading(false)
    }
  }

  // 初始載入和篩選變更時重新載入
  useEffect(() => {
    loadSources()
  }, [filters])

  // 處理搜尋
  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      name: searchTerm || undefined,
      skip: 0 // 重置到第一頁
    }))
    setCurrentPage(0)
  }

  // 處理認證類型篩選
  const handleAuthTypeFilter = (authType: AuthType | '') => {
    setFilters(prev => ({
      ...prev,
      auth_type: authType || undefined,
      skip: 0 // 重置到第一頁
    }))
    setCurrentPage(0)
  }

  // 處理分頁
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters(prev => ({
      ...prev,
      skip: newPage * pageSize
    }))
  }

  // 處理刪除來源
  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    if (!confirm(`確定要刪除來源 "${sourceName}" 嗎？此操作無法復原。`)) {
      return
    }

    try {
      const response = await sourceService.deleteSource(sourceId)

      if (response.error) {
        alert(`刪除失敗：${response.error.message}`)
      } else {
        alert('來源刪除成功')
        loadSources() // 重新載入列表
      }
    } catch (err) {
      alert('刪除來源時發生錯誤')
    }
  }


  // 載入狀態
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">來源管理</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入來源列表中...</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">來源管理</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">載入失敗</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={loadSources}
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
          <h1 className="text-2xl font-bold text-gray-900">來源管理</h1>
          <p className="text-gray-600">管理 webhook 來源設定</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">共 {total} 個來源</p>
        </div>
      </div>

      {/* 搜尋和篩選工具列 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜尋輸入 */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              搜尋來源名稱
            </label>
            <input
              type="text"
              id="search"
              placeholder="搜尋來源名稱..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* 認證類型篩選 */}
          <div className="sm:w-48">
            <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1">
              認證類型
            </label>
            <select
              id="authType"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleAuthTypeFilter(e.target.value as AuthType | '')}
              defaultValue=""
            >
              <option value="">全部</option>
              <option value="signature">簽名驗證</option>
              <option value="none">無驗證</option>
            </select>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/sources/create')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              新增來源
            </button>
          </div>
        </div>
      </div>

      {/* 來源列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {(!sources || sources.length === 0) ? (
          /* 空狀態 */
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m16 0l-4-4m0 0l-4 4" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">尚未建立任何來源</h3>
            <p className="mt-2 text-gray-600">創建第一個來源來開始接收 webhook 事件</p>
            <button
              onClick={() => navigate('/sources/create')}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              創建第一個來源
            </button>
          </div>
        ) : (
          <>
            {/* 表格標頭 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">
                    顯示 {Math.min((currentPage * pageSize) + 1, total)}-{Math.min((currentPage + 1) * pageSize, total)} 筆，共 {total} 筆
                  </span>
                </div>
              </div>
            </div>

            {/* 來源表格 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      名稱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      認證類型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      創建時間
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{source.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          source.auth_type === 'signature'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {source.auth_type === 'signature' ? '簽名驗證' : '無驗證'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(source.created_at).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/sources/${source.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          檢視
                        </button>
                        <button
                          onClick={() => navigate(`/sources/${source.id}/edit`)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeleteSource(source.id, source.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分頁控制 */}
            {total > pageSize && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  第 {currentPage + 1} 頁，共 {Math.ceil(total / pageSize)} 頁
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    aria-label="上一頁"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={(currentPage + 1) * pageSize >= total}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    aria-label="下一頁"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
