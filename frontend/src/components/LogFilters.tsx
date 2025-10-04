import { useState, useEffect } from 'react'
import type { EventLogStatus } from '../types/log'

interface LogFiltersProps {
  /** 篩選類型 */
  filterType?: 'events' | 'dispatches' | 'unified'
  /** 當前篩選條件 */
  currentFilters: any
  /** 篩選條件變更回調 */
  onFiltersChange: (filters: any) => void
  /** 搜尋回調 */
  onSearch?: (query: string) => void
  /** 當前搜尋查詢 */
  searchQuery?: string
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 日誌篩選器元件
 * 提供狀態篩選、時間範圍選擇、關鍵字搜尋等功能
 */
export const LogFilters = ({
  filterType = 'unified',
  currentFilters,
  onFiltersChange,
  onSearch,
  searchQuery: externalSearchQuery = '',
  className = ''
}: LogFiltersProps) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  })

  // 同步外部搜尋查詢到內部狀態
  useEffect(() => {
    if (externalSearchQuery !== internalSearchQuery) {
      setInternalSearchQuery(externalSearchQuery)
    }
  }, [externalSearchQuery])

  // 事件日誌狀態選項
  const eventStatusOptions: { value: EventLogStatus | '', label: string, icon: string, color: string }[] = [
    { value: '', label: '全部狀態', icon: '📋', color: 'text-gray-600' },
    { value: 'RECEIVED', label: '已接收', icon: '📥', color: 'text-blue-600' },
    { value: 'QUEUED', label: '已排隊', icon: '⏳', color: 'text-yellow-600' },
    { value: 'FAILED_VALIDATION', label: '驗證失敗', icon: '❌', color: 'text-red-600' }
  ]

  // 派發日誌狀態選項
  const dispatchStatusOptions: { value: string | '', label: string, icon: string, color: string }[] = [
    { value: '', label: '全部狀態', icon: '📋', color: 'text-gray-600' },
    { value: 'SUCCESS', label: '成功', icon: '✅', color: 'text-green-600' },
    { value: 'QUEUED', label: '已排隊', icon: '⏳', color: 'text-yellow-600' },
    { value: 'FAILED', label: '失敗', icon: '❌', color: 'text-red-600' },
    { value: 'TIMEOUT', label: '超時', icon: '⏰', color: 'text-orange-600' }
  ]

  // 處理狀態篩選變更
  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...currentFilters,
      status: status || undefined,
      skip: 0 // 重置到第一頁
    })
  }

  // 處理主題 ID 篩選
  const handleTopicIdChange = (topicId: string) => {
    onFiltersChange({
      ...currentFilters,
      topic_id: topicId.trim() || undefined,
      skip: 0
    })
  }

  // 處理訂閱 ID 篩選
  const handleSubscriptionIdChange = (subscriptionId: string) => {
    onFiltersChange({
      ...currentFilters,
      subscription_id: subscriptionId.trim() || undefined,
      skip: 0
    })
  }

  // 處理來源 IP 篩選
  const handleSourceIpChange = (sourceIp: string) => {
    onFiltersChange({
      ...currentFilters,
      source_ip: sourceIp.trim() || undefined,
      skip: 0
    })
  }

  // 處理日期範圍變更
  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    const newDateRange = { ...dateRange, [field]: value }
    setDateRange(newDateRange)

    onFiltersChange({
      ...currentFilters,
      date_from: newDateRange.from || undefined,
      date_to: newDateRange.to || undefined,
      skip: 0
    })
  }

  // 處理搜尋
  const handleSearch = () => {
    if (onSearch) {
      onSearch(internalSearchQuery.trim())
    }
  }

  // 清除所有篩選條件
  const clearAllFilters = () => {
    setInternalSearchQuery('')
    setDateRange({ from: '', to: '' })
    if (onSearch) {
      onSearch('') // 清除外部搜尋
    }
    onFiltersChange({
      skip: 0,
      limit: currentFilters.limit || 20
    })
  }

  // 快速時間篩選
  const applyQuickTimeFilter = (hours: number) => {
    const now = new Date()
    const past = new Date(now.getTime() - hours * 60 * 60 * 1000)

    const newDateRange = {
      from: past.toISOString().slice(0, 16), // 移除秒數和毫秒
      to: now.toISOString().slice(0, 16)
    }

    setDateRange(newDateRange)
    onFiltersChange({
      ...currentFilters,
      date_from: newDateRange.from,
      date_to: newDateRange.to,
      skip: 0
    })
  }

  // 快速狀態篩選
  const applyQuickStatusFilter = (status: string) => {
    onFiltersChange({
      ...currentFilters,
      status: status || undefined,
      skip: 0
    })
  }

  // 檢查是否有活躍的篩選條件
  const hasActiveFilters = (): boolean => {
    return !!(
      currentFilters.status ||
      currentFilters.topic_id ||
      currentFilters.subscription_id ||
      currentFilters.source_ip ||
      currentFilters.date_from ||
      currentFilters.date_to ||
      (externalSearchQuery || internalSearchQuery).trim()
    )
  }

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">篩選和搜尋</h3>
        {hasActiveFilters() && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            清除所有篩選
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 關鍵字搜尋 */}
        {onSearch && (
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              關鍵字搜尋
            </label>
            <div className="flex">
              <input
                type="text"
                id="search"
                value={internalSearchQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setInternalSearchQuery(value)
                  // 當用戶開始編輯時，如果有外部搜尋查詢，需要清除它
                  if (externalSearchQuery && value !== externalSearchQuery) {
                    if (onSearch) {
                      onSearch('') // 清除外部搜尋，讓用戶可以自由編輯
                    }
                  }
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜尋日誌 ID、狀態、錯誤訊息..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              支援 ID、狀態、錯誤訊息等關鍵字搜尋
            </p>
          </div>
        )}

        {/* 狀態篩選 */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            狀態
          </label>
          <select
            id="status"
            value={currentFilters.status || ''}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(filterType === 'events' ? eventStatusOptions : dispatchStatusOptions).map(option => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 主題 ID 篩選 */}
        {(filterType === 'events' || filterType === 'unified') && (
          <div>
            <label htmlFor="topicId" className="block text-sm font-medium text-gray-700 mb-1">
              主題 ID
            </label>
            <input
              type="text"
              id="topicId"
              value={currentFilters.topic_id || ''}
              onChange={(e) => handleTopicIdChange(e.target.value)}
              placeholder="輸入主題 ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 訂閱 ID 篩選 */}
        {(filterType === 'dispatches' || filterType === 'unified') && (
          <div>
            <label htmlFor="subscriptionId" className="block text-sm font-medium text-gray-700 mb-1">
              訂閱 ID
            </label>
            <input
              type="text"
              id="subscriptionId"
              value={currentFilters.subscription_id || ''}
              onChange={(e) => handleSubscriptionIdChange(e.target.value)}
              placeholder="輸入訂閱 ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 來源 IP 篩選 */}
        {filterType === 'events' && (
          <div>
            <label htmlFor="sourceIp" className="block text-sm font-medium text-gray-700 mb-1">
              來源 IP
            </label>
            <input
              type="text"
              id="sourceIp"
              value={currentFilters.source_ip || ''}
              onChange={(e) => handleSourceIpChange(e.target.value)}
              placeholder="輸入 IP 位址..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 開始日期 */}
        <div>
          <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
            開始日期
          </label>
          <input
            type="datetime-local"
            id="dateFrom"
            value={dateRange.from}
            onChange={(e) => handleDateRangeChange('from', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 結束日期 */}
        <div>
          <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
            結束日期
          </label>
          <input
            type="datetime-local"
            id="dateTo"
            value={dateRange.to}
            onChange={(e) => handleDateRangeChange('to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 快速篩選按鈕 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">快速篩選</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* 時間快速篩選 */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-2">時間:</span>
            <button
              onClick={() => applyQuickTimeFilter(1)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="最近1小時"
            >
              1小時
            </button>
            <button
              onClick={() => applyQuickTimeFilter(24)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="最近24小時"
            >
              24小時
            </button>
            <button
              onClick={() => applyQuickTimeFilter(168)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              title="最近7天"
            >
              7天
            </button>
          </div>

          {/* 狀態快速篩選 */}
          {(filterType === 'events' ? eventStatusOptions : dispatchStatusOptions)
            .filter(option => option.value) // 過濾掉"全部狀態"
            .map(option => (
              <button
                key={option.value}
                onClick={() => applyQuickStatusFilter(option.value)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded transition-colors flex items-center gap-1"
                title={`只顯示${option.label}`}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* 活躍篩選條件顯示 */}
      {hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">活躍篩選:</span>

            {currentFilters.status && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {(filterType === 'events' ? eventStatusOptions : dispatchStatusOptions)
                  .find(opt => opt.value === currentFilters.status)?.icon || '📋'} 狀態: {
                  (filterType === 'events' ? eventStatusOptions : dispatchStatusOptions)
                    .find(opt => opt.value === currentFilters.status)?.label || currentFilters.status
                }
                <button
                  onClick={() => handleStatusChange('')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}

            {currentFilters.topic_id && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                📌 主題: <code className="bg-green-200 px-1 rounded text-xs">{currentFilters.topic_id.slice(-8)}...</code>
                <button
                  onClick={() => handleTopicIdChange('')}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}

            {currentFilters.subscription_id && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                🔗 訂閱: <code className="bg-purple-200 px-1 rounded text-xs">{currentFilters.subscription_id.slice(-8)}...</code>
                <button
                  onClick={() => handleSubscriptionIdChange('')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}

            {currentFilters.source_ip && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                🌐 IP: <code className="bg-orange-200 px-1 rounded text-xs">{currentFilters.source_ip}</code>
                <button
                  onClick={() => handleSourceIpChange('')}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}

            {(dateRange.from || dateRange.to) && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                📅 日期範圍
                <button
                  onClick={() => {
                    handleDateRangeChange('from', '')
                    handleDateRangeChange('to', '')
                  }}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            )}

            {(externalSearchQuery || internalSearchQuery).trim() && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                🔍 搜尋: <code className="bg-yellow-200 px-1 rounded text-xs">"{externalSearchQuery || internalSearchQuery}"</code>
                <button
                  onClick={() => {
                    setInternalSearchQuery('')
                    if (onSearch) onSearch('')
                  }}
                  className="ml-1 text-yellow-600 hover:text-yellow-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
