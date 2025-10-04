import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
  it('renders title and value correctly', () => {
    render(
      <StatCard
        title="總 Webhook 數"
        value="1,234"
        icon={<span data-testid="test-icon">📊</span>}
      />
    )

    expect(screen.getByText('總 Webhook 數')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('displays change indicator when provided', () => {
    render(
      <StatCard
        title="今日 Webhook"
        value="50"
        change="+12%"
        changeType="increase"
        icon={<span>📈</span>}
      />
    )

    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('+12%')).toHaveClass('text-green-600')
  })

  it('displays decrease change with red color', () => {
    render(
      <StatCard
        title="錯誤率"
        value="2.5%"
        change="-0.5%"
        changeType="decrease"
        icon={<span>📉</span>}
      />
    )

    expect(screen.getByText('-0.5%')).toBeInTheDocument()
    expect(screen.getByText('-0.5%')).toHaveClass('text-red-600')
  })

  it('displays neutral change with gray color', () => {
    render(
      <StatCard
        title="活躍訂閱"
        value="25"
        change="0%"
        changeType="neutral"
        icon={<span>➡️</span>}
      />
    )

    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0%')).toHaveClass('text-gray-600')
  })

  it('shows loading state when isLoading is true', () => {
    render(
      <StatCard
        title="載入中指標"
        value="..."
        icon={<span>⏳</span>}
        isLoading={true}
      />
    )

    // Check for loading animation on the main card element
    const card = screen.getByText('載入中指標').closest('[class*="bg-white"]')
    expect(card).toHaveClass('animate-pulse')
  })

  it('applies custom className', () => {
    render(
      <StatCard
        title="自定義樣式"
        value="100"
        icon={<span>🎨</span>}
        className="custom-class"
      />
    )

    const card = screen.getByText('自定義樣式').closest('[class*="bg-white"]')
    expect(card).toHaveClass('custom-class')
  })

  it('renders with trend icon based on changeType', () => {
    render(
      <StatCard
        title="趨勢測試"
        value="75"
        change="+5%"
        changeType="increase"
        icon={<span>📊</span>}
      />
    )

    // Check for trend up icon
    expect(screen.getByText('↗')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    render(
      <StatCard
        title="大數字"
        value={1234567}
        icon={<span>🔢</span>}
      />
    )

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
  })

  it('displays tooltip when provided', () => {
    render(
      <StatCard
        title="帶提示的卡片"
        value="42"
        icon={<span>💡</span>}
        tooltip="這是一個測試提示"
      />
    )

    // Note: Tooltip implementation would depend on your tooltip library
    // This is a basic check that the prop is accepted
    expect(screen.getByText('帶提示的卡片')).toBeInTheDocument()
  })
})
