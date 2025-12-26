import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { Download, RefreshCw, AlertCircle } from 'lucide-react'
import { statsService } from '../services/statsService'
import type { ActivityStats, TimeRange } from '../types/stats'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ActivityChartProps {
  className?: string
  initialTimeRange?: TimeRange
  showControls?: boolean
  height?: number
}

export const ActivityChart = ({
  className = '',
  initialTimeRange = '7d',
  showControls = true,
  height = 400
}: ActivityChartProps) => {
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange)

  const loadStats = async (days?: number) => {
    setLoading(true)
    setError(null)
    try {
      const daysToFetch = days || getDaysFromTimeRange(timeRange)
      const response = await statsService.getActivityStats(daysToFetch)
      if (response.error) {
        setError(response.error.message)
      } else if (response.data) {
        setActivityStats(response.data)
      }
    } catch (err) {
      setError('載入活動統計失敗')
    } finally {
      setLoading(false)
    }
  }

  const getDaysFromTimeRange = (range: TimeRange): number => {
    switch (range) {
      case '1d': return 1
      case '30d': return 30
      case '90d': return 90
      default: return 7
    }
  }

  useEffect(() => {
    loadStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#64748b' }
      },
      y: {
        border: { display: false },
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 11 }, color: '#64748b', maxTicksLimit: 5 }
      }
    },
    elements: {
      line: { tension: 0.4 },
      point: { radius: 0, hitRadius: 10, hoverRadius: 4 }
    }
  }

  const chartData = {
    labels: activityStats?.daily_trend?.map(d => d.date) || [],
    datasets: [
      {
        fill: true,
        label: 'Webhook 總數',
        data: activityStats?.daily_trend?.map(d => d.total) || [],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.05)',
        borderWidth: 2,
      }
    ]
  }

  if (loading && !activityStats) {
    return (
      <div className={`bg-white rounded-xl shadow-soft p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-6 w-32 bg-slate-100 rounded" />
            <div className="h-8 w-24 bg-slate-100 rounded" />
          </div>
          <div className="h-64 bg-slate-100 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error && !activityStats) {
    return (
      <div className={`bg-white rounded-xl shadow-soft p-6 flex flex-col items-center justify-center text-center ${className}`} style={{ height: height + 100 }}>
        <AlertCircle className="text-red-500 mb-3" size={40} />
        <h3 className="text-lg font-medium text-slate-900">載入失敗</h3>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => loadStats()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <RefreshCw size={16} /> 重新載入
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-soft border border-slate-100 p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">活動趨勢</h2>
          <p className="text-sm text-slate-500">Webhook 處理量監控</p>
        </div>

        {showControls && (
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => {
                const r = e.target.value as TimeRange;
                setTimeRange(r);
                loadStats(getDaysFromTimeRange(r));
              }}
              className="text-sm bg-slate-50 border-none rounded-lg px-3 py-2 text-slate-600 focus:ring-2 focus:ring-primary-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
              <option value="90d">最近 90 天</option>
            </select>
            <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <Download size={20} />
            </button>
          </div>
        )}
      </div>

      <div style={{ height }}>
        <Line options={chartOptions} data={chartData} />
      </div>
    </div>
  )
}
