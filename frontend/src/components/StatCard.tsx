import { ReactNode } from 'react'

interface StatCardProps {
  /** 卡片標題 */
  title: string
  /** 數值 */
  value: string | number
  /** 圖標 */
  icon: ReactNode
  /** 變化值（如 "+12%" 或 "-5%"） */
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

/**
 * 統計卡片元件
 * 顯示系統關鍵指標的卡片式佈局
 */
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
  // 格式化數值（添加千分位分隔符）
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val
    return val.toLocaleString('zh-TW')
  }

  // 根據變化類型獲取顏色和圖標
  const getChangeStyles = () => {
    switch (changeType) {
      case 'increase':
        return {
          textColor: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: '↗',
          iconColor: 'text-green-500'
        }
      case 'decrease':
        return {
          textColor: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: '↘',
          iconColor: 'text-red-500'
        }
      case 'neutral':
      default:
        return {
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: '→',
          iconColor: 'text-gray-500'
        }
    }
  }

  const changeStyles = getChangeStyles()

  return (
    <div
      className={`bg-white overflow-hidden shadow rounded-lg ${isLoading ? 'animate-pulse' : ''} ${className}`}
      title={tooltip}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${isLoading ? 'bg-gray-200' : 'bg-blue-500'}`}>
              <div className={`text-white ${isLoading ? 'invisible' : ''}`}>
                {icon}
              </div>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className={`text-sm font-medium ${isLoading ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className={`text-lg font-semibold ${isLoading ? 'text-gray-400' : 'text-gray-900'}`}>
                  {isLoading ? '...' : formatValue(value)}
                </div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${changeStyles.textColor}`}>
                    <span className={`${changeStyles.iconColor} mr-1`}>
                      {changeStyles.icon}
                    </span>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      {change && (
        <div className={`bg-gray-50 px-5 py-3 ${changeStyles.bgColor}`}>
          <div className="text-sm">
            <div className={`font-medium ${changeStyles.textColor}`}>
              {changeType === 'increase' && '較上期增加'}
              {changeType === 'decrease' && '較上期減少'}
              {changeType === 'neutral' && '與上期持平'}
            </div>
            <div className="text-gray-500">
              {change} 的變化
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
