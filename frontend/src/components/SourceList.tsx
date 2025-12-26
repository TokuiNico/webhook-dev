import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Shield, ShieldCheck, Eye, Edit2, Trash2, Database } from 'lucide-react'
import { sourceService } from '../services/sourceService'
import type { SourceResponse, SourceFilterParams, AuthType } from '../types/source'

interface SourceListProps {
  className?: string
}

export const SourceList = ({ className = '' }: SourceListProps) => {
  const navigate = useNavigate()
  const [sources, setSources] = useState<SourceResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(10)

  const [filters, setFilters] = useState<SourceFilterParams>({
    skip: 0,
    limit: pageSize
  })

  const loadSources = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await sourceService.getSources(filters)
      if (response.error) {
        setError(response.error.message)
        setSources([])
      } else if (response.data) {
        if (Array.isArray(response.data)) {
          setSources(response.data)
          setTotal(response.data.length)
        } else if (response.data.items) {
          setSources(response.data.items)
          setTotal(response.data.total || 0)
        } else {
          setSources([])
        }
      } else {
        setSources([])
      }
    } catch (err) {
      setError('載入來源列表失敗')
      setSources([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSources()
  }, [filters])

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      name: searchTerm || undefined,
      skip: 0
    }))
    setCurrentPage(0)
  }

  const handleAuthTypeFilter = (authType: AuthType | '') => {
    setFilters(prev => ({
      ...prev,
      auth_type: authType || undefined,
      skip: 0
    }))
    setCurrentPage(0)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters(prev => ({
      ...prev,
      skip: newPage * pageSize
    }))
  }

  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    if (!confirm(`確定要刪除來源 "${sourceName}" 嗎？此操作無法復原。`)) return

    try {
      const response = await sourceService.deleteSource(sourceId)
      if (response.error) {
        alert(`刪除失敗：${response.error.message}`)
      } else {
        loadSources()
      }
    } catch (err) {
      alert('刪除來源時發生錯誤')
    }
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">來源管理</h1>
        </div>
        <div className="card text-center py-12 border-rose-200 bg-rose-50">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-rose-700 mb-2">載入失敗</h3>
          <p className="text-rose-600 mb-6">{error}</p>
          <button onClick={loadSources} className="btn bg-rose-600 hover:bg-rose-700 border-transparent text-white gap-2">
            重新載入
          </button>
        </div>
      </div>
    )
  }

  if (loading && total === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">來源管理</h1>
        </div>
        <div className="card text-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">來源管理</h1>
          <p className="text-slate-500 mt-1">管理與監控所有 Webhook 來源設定</p>
        </div>
        <button
          onClick={() => navigate('/sources/create')}
          className="btn gap-2 shadow-lg shadow-primary-500/20"
        >
          <Plus size={18} />
          新增來源
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="搜尋來源名稱..."
              className="input pl-10"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-56 relative">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <select
              className="input pl-10 appearance-none"
              onChange={(e) => handleAuthTypeFilter(e.target.value as AuthType | '')}
              defaultValue=""
            >
              <option value="">所有認證類型</option>
              <option value="signature">簽名驗證 (HMAC)</option>
              <option value="none">無驗證</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {(!sources || sources.length === 0) ? (
          <div className="p-16 text-center text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">尚未建立來源</h3>
            <p className="mt-1">建立第一個來源以開始接收 Webhook 事件</p>
            <button
              onClick={() => navigate('/sources/create')}
              className="mt-6 btn-secondary gap-2"
            >
              <Plus size={16} /> 立即建立
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">來源名稱</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">認證狀態</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">建立時間</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sources.map((source) => (
                    <tr key={source.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {source.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${source.auth_type === 'signature'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                          }`}>
                          {source.auth_type === 'signature' ? <ShieldCheck size={14} /> : <Shield size={14} />}
                          {source.auth_type === 'signature' ? '已加密驗證' : '公開來源'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(source.created_at).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/sources/${source.id}`)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="檢視"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => navigate(`/sources/${source.id}/edit`)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="編輯"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteSource(source.id, source.name)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="text-sm text-slate-500">
                  顯示 {(currentPage * pageSize) + 1} - {Math.min((currentPage + 1) * pageSize, total)}，共 {total} 筆
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-md text-sm text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={(currentPage + 1) * pageSize >= total}
                    className="px-3 py-1 bg-white border border-slate-300 rounded-md text-sm text-slate-600 disabled:opacity-50 hover:bg-slate-50"
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
