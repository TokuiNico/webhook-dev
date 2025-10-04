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
  const [filters, setFilters] = useState<any>({
    skip: 0,
    limit: 20
  })
  const [searchQuery, setSearchQuery] = useState('')

  // 處理篩選條件變更
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters)
  }

  // 處理搜尋
  const handleSearch = async (query: string) => {
    const trimmedQuery = query.trim()
    setSearchQuery(trimmedQuery)

    if (trimmedQuery) {
      // 如果有搜尋查詢，設定搜尋標記
      setFilters(prev => ({
        ...prev,
        skip: 0,
        search: trimmedQuery
      }))
    } else {
      // 如果搜尋查詢為空，清除搜尋標記
      setFilters(prev => {
        const { search, ...rest } = prev
        return {
          ...rest,
          skip: 0
        }
      })
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
        searchQuery={searchQuery}
      />

      {/* 日誌列表 */}
      <LogList
        displayType={displayType}
        filters={filters}
      />
    </div>
  )
}
