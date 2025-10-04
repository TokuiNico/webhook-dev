import { useState } from 'react'
import type { EventLogStatus, DispatchLogStatus } from '../types/log'

interface LogFiltersProps {
  /** 篩選類型 */
  filterType?: 'events' | 'dispatches' | 'unified'
  /** 當前篩選條件 */
  currentFilters: any
  /** 篩選條件變更回調 */
  onFiltersChange: (filters: any) => void
  /** 搜尋回調 */
  onSearch?: (query: string) => void
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
  className = ''
}: LogFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  })

  // 事件日誌狀態選項
  const eventStatusOptions: { value: EventLogStatus | '', label: string }[] = [
    { value: '', label: '全部狀態' },
    { value: 'RECEIVED', label: '已接收' },
    { value: 'QUEUED', label: '已排隊' },
    { value: 'FAILED_VALIDATION', label: '驗證失敗' }
  ]

  // 派發日誌狀態選項
  const dispatchStatusOptions: { value: DispatchLogStatus | '', label: string }[] = [
    { value: '', label: '全部狀態' },
    { value: 'PENDING', label: '待處理' },
    { value: 'SUCCESS', label: '成功' },
    { value: 'FAILED', label: '失敗' },
    { value: 'TIMEOUT', label: '超時' }
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
      onSearch(searchQuery.trim())
    }
  }

  // 清除所有篩選條件
  const clearAllFilters = () => {
    setSearchQuery('')
    setDateRange({ from: '', to: '' })
    onFiltersChange({
      skip: 0,
      limit: currentFilters.limit || 20
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
      searchQuery.trim()
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                {option.label}
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

      {/* 活躍篩選條件顯示 */}
      {hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">活躍篩選:</span>

            {currentFilters.status && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                狀態: {currentFilters.status}
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
                主題: {currentFilters.topic_id.slice(-8)}...
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
                訂閱: {currentFilters.subscription_id.slice(-8)}...
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
                IP: {currentFilters.source_ip}
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
                日期: {dateRange.from || '...'} ~ {dateRange.to || '...'}
                <button
                  onClick={() => handleDateRangeChange('from', '') || handleDateRangeChange('to', '')}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  ×
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                搜尋: "{searchQuery}"
                <button
                  onClick={() => {
                    setSearchQuery('')
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
