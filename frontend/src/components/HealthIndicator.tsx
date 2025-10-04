import type { SystemStatus } from '../types/dashboard'

interface HealthIndicatorProps {
  /** 系統狀態 */
  status: SystemStatus
  /** 正常運行時間 */
  uptime?: string
  /** 平均響應時間 */
  responseTime?: string
  /** 最後檢查時間 */
  lastChecked?: string
  /** 是否顯示詳細狀態 */
  showDetails?: boolean
  /** 是否正在載入 */
  isLoading?: boolean
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 系統健康狀態指示器元件
 * 顯示系統整體健康狀態和關鍵指標
 */
export const HealthIndicator = ({
  status,
  uptime,
  responseTime,
  lastChecked,
  showDetails = false,
  isLoading = false,
  className = ''
}: HealthIndicatorProps) => {
  // 狀態配置
  const statusConfig = {
    healthy: {
      label: '系統健康',
      description: '所有服務正常運行',
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      icon: '✅'
    },
    warning: {
      label: '系統警告',
      description: '部分服務存在問題',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      icon: '⚠️'
    },
    critical: {
      label: '系統異常',
      description: '多個服務出現故障',
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      icon: '❌'
    }
  }

  const config = statusConfig[status]

  // 詳細狀態資訊
  const serviceStatus = [
    { name: 'Webhook 處理', status: status === 'healthy' ? '正常' : status === 'warning' ? '警告' : '異常' },
    { name: '資料庫連接', status: status === 'critical' ? '異常' : '正常' },
    { name: '快取服務', status: status === 'critical' ? '異常' : '正常' },
    { name: 'API 服務', status: '正常' },
    { name: '任務隊列', status: status === 'critical' ? '異常' : '正常' }
  ]

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow animate-pulse ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className="mt-4 text-center text-gray-500">檢查中...</div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white p-6 rounded-lg shadow ${className}`}
      role="status"
      aria-label={`系統狀態：${config.label}`}
    >
      {/* 狀態標題和指示器 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            data-testid="health-indicator"
            className={`w-4 h-4 rounded-full ${config.color} ${isLoading ? 'animate-pulse' : ''}`}
          ></div>
          <div>
            <h3 className={`text-lg font-semibold ${config.textColor}`}>
              {config.label}
            </h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>
        <div className="text-2xl">{config.icon}</div>
      </div>

      {/* 關鍵指標 */}
      {(uptime || responseTime || lastChecked) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {uptime && (
            <div className={`p-3 rounded-md ${config.bgColor}`}>
              <div className="text-sm text-gray-600">正常運行時間</div>
              <div className={`text-lg font-semibold ${config.textColor}`}>{uptime}</div>
            </div>
          )}
          {responseTime && (
            <div className={`p-3 rounded-md ${config.bgColor}`}>
              <div className="text-sm text-gray-600">平均響應時間</div>
              <div className={`text-lg font-semibold ${config.textColor}`}>{responseTime}</div>
            </div>
          )}
          {lastChecked && (
            <div className={`p-3 rounded-md ${config.bgColor}`}>
              <div className="text-sm text-gray-600">最後檢查</div>
              <div className={`text-sm font-semibold ${config.textColor}`}>{lastChecked}</div>
            </div>
          )}
        </div>
      )}

      {/* 詳細狀態資訊 */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">詳細狀態</h4>
          <div className="space-y-2">
            {serviceStatus.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">{service.name}</span>
                <span
                  className={`text-sm font-medium ${
                    service.status === '正常'
                      ? 'text-green-600'
                      : service.status === '警告'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 狀態摘要 */}
      <div className={`mt-4 p-3 rounded-md ${config.bgColor}`}>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">
            系統健康評分：
            <span className={`font-semibold ml-1 ${config.textColor}`}>
              {status === 'healthy' ? '優秀' : status === 'warning' ? '良好' : '需要關注'}
            </span>
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {status === 'healthy'
            ? '所有關鍵指標正常，系統運行穩定'
            : status === 'warning'
            ? '部分指標需要監控，建議關注系統狀態'
            : '多個關鍵指標異常，建議立即檢查系統'
          }
        </div>
      </div>
    </div>
  )
}
