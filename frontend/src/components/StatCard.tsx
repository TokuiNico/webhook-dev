import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  /** 卡片標題 */
  title: string
  /** 數值 */
  value: string | number
  /** 圖標 */
  icon: ReactNode
  /** 變化值（如 "12%"） */
  change?: string
  /** 變化類型 */
  changeType?: 'increase' | 'decrease' | 'neutral'
  /** 是否正在載入 */
  isLoading?: boolean
  /** 自定義 CSS 類名 */
  className?: string
  /** 提示文字 */
  tooltip?: string
}

export const StatCard = ({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  isLoading = false,
  className = '',
  tooltip
}: StatCardProps) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val
    return val.toLocaleString('zh-TW')
  }

  const getChangeMeta = () => {
    switch (changeType) {
      case 'increase':
        return { color: 'text-emerald-600 bg-emerald-50', icon: <TrendingUp size={14} />, text: '較上期增加' }
      case 'decrease':
        return { color: 'text-rose-600 bg-rose-50', icon: <TrendingDown size={14} />, text: '較上期減少' }
      default:
        return { color: 'text-slate-600 bg-slate-50', icon: <Minus size={14} />, text: '與上期持平' }
    }
  }

  const meta = getChangeMeta()

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-soft ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between items-start">
            <div className="h-10 w-10 bg-slate-100 rounded-lg" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-8 w-32 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-soft hover:shadow-lg transition-all duration-300 border border-slate-100 group ${className}`}
      title={tooltip}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
          {icon}
        </div>
        {change && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
            {meta.icon}
            {change}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
        <div className="text-2xl font-bold text-slate-900 tracking-tight">
          {formatValue(value)}
        </div>
        {change && (
          <p className="mt-1 text-xs text-slate-400">
            {meta.text}
          </p>
        )}
      </div>
    </div>
  )
}
