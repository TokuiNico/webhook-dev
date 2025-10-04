import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HealthIndicator } from '../HealthIndicator'
import type { SystemStatus } from '../../types/dashboard'

describe('HealthIndicator', () => {
  it('displays healthy status correctly', () => {
    render(<HealthIndicator status="healthy" />)

    expect(screen.getByText('系統健康')).toBeInTheDocument()
    expect(screen.getByText('所有服務正常運行')).toBeInTheDocument()

    // Check for green indicator
    const indicator = screen.getByTestId('health-indicator')
    expect(indicator).toHaveClass('bg-green-500')
  })

  it('displays warning status correctly', () => {
    render(<HealthIndicator status="warning" />)

    expect(screen.getByText('系統警告')).toBeInTheDocument()
    expect(screen.getByText('部分服務存在問題')).toBeInTheDocument()

    // Check for yellow indicator
    const indicator = screen.getByTestId('health-indicator')
    expect(indicator).toHaveClass('bg-yellow-500')
  })

  it('displays critical status correctly', () => {
    render(<HealthIndicator status="critical" />)

    expect(screen.getByText('系統異常')).toBeInTheDocument()
    expect(screen.getByText('多個服務出現故障')).toBeInTheDocument()

    // Check for red indicator
    const indicator = screen.getByTestId('health-indicator')
    expect(indicator).toHaveClass('bg-red-500')
  })

  it('applies custom className', () => {
    render(<HealthIndicator status="healthy" className="custom-health" />)

    const container = screen.getByRole('status')
    expect(container).toHaveClass('custom-health')
  })

  it('displays loading state when isLoading is true', () => {
    render(<HealthIndicator status="healthy" isLoading={true} />)

    expect(screen.getByText('檢查中...')).toBeInTheDocument()
    // Check that the main container has animate-pulse
    const container = screen.getByText('檢查中...').closest('[class*="bg-white"]')
    expect(container).toHaveClass('animate-pulse')
  })

  it('shows uptime information when provided', () => {
    render(<HealthIndicator status="healthy" uptime="99.9%" />)

    expect(screen.getByText('正常運行時間')).toBeInTheDocument()
    expect(screen.getByText('99.9%')).toBeInTheDocument()
  })

  it('shows response time when provided', () => {
    render(<HealthIndicator status="healthy" responseTime="245ms" />)

    expect(screen.getByText('平均響應時間')).toBeInTheDocument()
    expect(screen.getByText('245ms')).toBeInTheDocument()
  })

  it('displays all metrics when provided', () => {
    render(
      <HealthIndicator
        status="healthy"
        uptime="99.9%"
        responseTime="245ms"
        lastChecked="2024-01-01 10:30:00"
      />
    )

    expect(screen.getByText('正常運行時間')).toBeInTheDocument()
    expect(screen.getByText('99.9%')).toBeInTheDocument()
    expect(screen.getByText('平均響應時間')).toBeInTheDocument()
    expect(screen.getByText('245ms')).toBeInTheDocument()
    expect(screen.getByText('最後檢查')).toBeInTheDocument()
    expect(screen.getByText('2024-01-01 10:30:00')).toBeInTheDocument()
  })

  it('shows detailed status information', () => {
    render(<HealthIndicator status="warning" showDetails={true} />)

    expect(screen.getByText('詳細狀態')).toBeInTheDocument()
    expect(screen.getByText('Webhook 處理')).toBeInTheDocument()
    expect(screen.getByText('資料庫連接')).toBeInTheDocument()
    expect(screen.getByText('快取服務')).toBeInTheDocument()
  })

  it('hides details by default', () => {
    render(<HealthIndicator status="warning" />)

    expect(screen.queryByText('詳細狀態')).not.toBeInTheDocument()
    expect(screen.queryByText('Webhook 處理')).not.toBeInTheDocument()
  })

  it('renders with correct accessibility attributes', () => {
    render(<HealthIndicator status="healthy" />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveAttribute('aria-label', '系統狀態：系統健康')
  })
})
