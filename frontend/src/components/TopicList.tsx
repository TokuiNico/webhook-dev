import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Hash, Copy, ExternalLink, Terminal, Tag, Info, Folder, Edit2, AlertCircle } from 'lucide-react'
import { topicService } from '../services/topicService'
import type { TopicResponse, TopicFilterParams } from '../types/topic'

interface TopicListProps {
  className?: string
}

export const TopicList = ({ className = '' }: TopicListProps) => {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<TopicResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [filters, setFilters] = useState<TopicFilterParams>({
    skip: 0,
    limit: 50
  })

  const groupedTopics = (topics || []).reduce((groups, topic) => {
    const sourceId = topic.source_id
    if (!groups[sourceId]) groups[sourceId] = []
    groups[sourceId].push(topic)
    return groups
  }, {} as Record<string, TopicResponse[]>)

  const loadTopics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await topicService.getTopics(filters)
      if (response.error) {
        setError(response.error.message)
        setTopics([])
      } else if (response.data) {
        if (Array.isArray(response.data)) {
          setTopics(response.data)
          setTotal(response.data.length)
        } else if (response.data.items) {
          setTopics(response.data.items)
          setTotal(response.data.total || 0)
        } else {
          setTopics([])
        }
      } else {
        setTopics([])
      }
    } catch (err) {
      setError('載入主題列表失敗')
      setTopics([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTopics()
  }, [filters])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSourceFilter = (sourceId: string) => {
    setFilters(prev => ({
      ...prev,
      source_id: sourceId || undefined,
      skip: 0
    }))
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">主題管理</h1>
        </div>
        <div className="card text-center py-12 border-rose-200 bg-rose-50">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-rose-500" />
          </div>
          <h3 className="text-lg font-bold text-rose-700 mb-2">載入失敗</h3>
          <p className="text-rose-600 mb-6">{error}</p>
          <button onClick={loadTopics} className="btn bg-rose-600 hover:bg-rose-700 border-transparent text-white gap-2">
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
          <h1 className="text-2xl font-bold text-slate-900">主題管理</h1>
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">主題管理</h1>
          <p className="text-slate-500 mt-1">管理各來源的事件類型與處理規則</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">總主題數</p>
          </div>
          <button
            onClick={() => navigate('/topics/create')}
            className="btn gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus size={18} />
            新增主題
          </button>
        </div>
      </div>

      {(!topics || topics.length === 0) ? (
        <div className="card py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">尚未建立主題</h3>
          <p className="mt-1 text-slate-500 mb-6">建立第一個主題以開始接收 Webhook 事件</p>
          <button
            onClick={() => navigate('/topics/create')}
            className="btn-secondary gap-2"
          >
            <Plus size={16} /> 立即建立
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTopics).map(([sourceId, sourceTopics]) => {
            const firstTopic = sourceTopics[0]
            const sourceName = firstTopic?.source_id || '未知來源'

            return (
              <div key={sourceId} className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary-100 text-primary-700 rounded-lg">
                      <Folder size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{sourceName}</h2>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
                      {sourceTopics.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleSourceFilter(sourceId)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
                  >
                    查看全部
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sourceTopics.map((topic) => (
                    <div key={topic.id} className="card hover:shadow-lg transition-all duration-300 border-slate-200 group">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Hash size={18} className="text-slate-400" />
                          <h3 className="font-bold text-slate-900 truncate max-w-[180px]" title={topic.name}>
                            {topic.name}
                          </h3>
                        </div>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/topics/${topic.id}/edit`)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="編輯"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => navigate(`/topics/${topic.id}`)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="檢視"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </div>

                      {topic.description && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">
                          {topic.description}
                        </p>
                      )}

                      <div className="bg-slate-50 rounded-lg p-3 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Tag size={12} />
                            <span>標籤</span>
                          </div>
                          <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {topic.name.split('.').pop()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs group/url">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Terminal size={12} />
                            <span>Endpoint</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(topic.ingest_url, topic.id)}
                            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {copiedId === topic.id ? '已複製!' : '複製 URL'}
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                        <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                          active
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm text-primary-600 h-fit">
          <Info size={24} />
        </div>
        <div>
          <h4 className="font-bold text-primary-900 mb-1">關於主題 (Topics)</h4>
          <p className="text-sm text-primary-700 leading-relaxed">
            主題是 Webhook 事件的分類單位（例如 `payment.success`、`user.created`）。
            您需要為每個外部事件類型建立對應的主題，系統會自動為每個主題生成唯一的接收網址 (Ingest URL)。
          </p>
        </div>
      </div>
    </div>
  )
}
