import { useState } from 'react'
import { LogFilters } from './LogFilters'
import { LogList } from './LogList'

interface LogViewerProps {
  /** 顯示類型 */
  displayType?: 'events' | 'dispatches' | 'unified'
  /** 自定義 CSS 類名 */
  className?: string
}

/**
 * 日誌查看器元件
 * 整合篩選器和列表，提供完整的日誌查看功能
 */
export const LogViewer = ({ displayType = 'unified', className = '' }: LogViewerProps) => {
  const [filters, setFilters] = useState({
    skip: 0,
    limit: 20
  })

  // 處理篩選條件變更
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  // 處理搜尋
  const handleSearch = async (query: string) => {
    if (query.trim()) {
      // 如果有搜尋查詢，使用搜尋功能
      // 這裡可以觸發搜尋邏輯
      console.log('搜尋:', query)
    } else {
      // 如果搜尋查詢為空，恢復正常篩選
      setFilters(prev => ({
        ...prev,
        skip: 0
      }))
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 篩選器 */}
      <LogFilters
        filterType={displayType}
        currentFilters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
      />

      {/* 日誌列表 */}
      <LogList
        displayType={displayType}
        initialFilters={filters}
      />
    </div>
  )
}
