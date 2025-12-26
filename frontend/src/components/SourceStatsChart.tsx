import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { Download, ArrowUp, ArrowDown } from 'lucide-react'
import { statsService } from '../services/statsService'
import type { SourceStats } from '../types/stats'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface SourceStatsChartProps {
  className?: string
  displayMode?: 'table' | 'chart' | 'both'
  sortBy?: 'webhooks' | 'topics' | 'success_rate' | 'name'
  sortOrder?: 'asc' | 'desc'
  limit?: number
}

export const SourceStatsChart = ({
  className = '',
  displayMode = 'both',
  sortBy = 'webhooks',
  sortOrder = 'desc',
  limit = 10
}: SourceStatsChartProps) => {
  const [sourceStats, setSourceStats] = useState<SourceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSort, setCurrentSort] = useState({ by: sortBy, order: sortOrder })

  const loadStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await statsService.getSourceStats()
      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setSourceStats(response.data)
      }
    } catch (err) {
      setError('載入來源統計失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: 'webhooks' | 'topics' | 'success_rate' | 'name') => {
    const newOrder = currentSort.by === field && currentSort.order === 'desc' ? 'asc' : 'desc'
    setCurrentSort({ by: field, order: newOrder })
  }

  const getSortedSources = () => {
    if (!sourceStats || !sourceStats.source_statistics) return []

    return [...sourceStats.source_statistics].sort((a, b) => {
      let aValue: any, bValue: any

      switch (currentSort.by) {
        case 'webhooks':
          aValue = a.webhook_count
          bValue = b.webhook_count
          break
        case 'topics':
          aValue = a.topic_count
          bValue = b.topic_count
          break
        case 'success_rate':
          // Mock success rate for now as it's missing in types
          aValue = a.webhook_count
          bValue = b.webhook_count
          break
        case 'name':
          aValue = a.source
          bValue = b.source
          break
        default: return 0
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      return currentSort.order === 'asc'
        ? (aValue > bValue ? 1 : -1)
        : (aValue < bValue ? 1 : -1)
    }).slice(0, limit)
  }

  useEffect(() => {
    loadStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sortedSources = getSortedSources()

  const chartData = {
    labels: sortedSources.map(s => s.source),
    datasets: [
      {
        label: 'Webhook 數量',
        data: sortedSources.map(s => s.webhook_count),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderRadius: 4,
      },
      {
        label: '主題數量',
        data: sortedSources.map(s => s.topic_count),
        backgroundColor: 'rgba(148, 163, 184, 0.8)',
        borderRadius: 4,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false }
    },
    scales: {
      y: { grid: { color: '#f1f5f9' }, border: { display: false } },
      x: { grid: { display: false } }
    }
  }

  if (loading && !sourceStats) {
    return (
      <div className={`bg-white rounded-xl shadow-soft p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-slate-100 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error && !sourceStats) return null // Ideally handle error state similarly to ActivityChart

  return (
    <div className={`bg-white rounded-xl shadow-soft border border-slate-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">來源統計分析</h2>
          <p className="text-sm text-slate-500">各來源 Webhook 處理概況</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            <Download size={20} />
          </button>
        </div>
      </div>

      {(displayMode === 'chart' || displayMode === 'both') && (
        <div className="mb-8 h-64">
          <Bar options={chartOptions} data={chartData} />
        </div>
      )}

      {(displayMode === 'table' || displayMode === 'both') && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="pb-3 pl-4 cursor-pointer hover:text-primary-600" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">來源名稱 {currentSort.by === 'name' && (currentSort.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                </th>
                <th className="pb-3 cursor-pointer hover:text-primary-600" onClick={() => handleSort('webhooks')}>
                  <div className="flex items-center gap-1">Webhooks {currentSort.by === 'webhooks' && (currentSort.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                </th>
                <th className="pb-3 cursor-pointer hover:text-primary-600" onClick={() => handleSort('topics')}>
                  <div className="flex items-center gap-1">主題數 {currentSort.by === 'topics' && (currentSort.order === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
                </th>
                <th className="pb-3">狀態</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
              {sortedSources.map((source, idx) => (
                <tr key={`${source.source}-${idx}`} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-4 font-medium text-slate-900">{source.source}</td>
                  <td className="py-3">{source.webhook_count.toLocaleString()}</td>
                  <td className="py-3">{source.topic_count}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                      活躍
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
