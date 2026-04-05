import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FilterTabs } from '@/components/search/FilterTabs'

describe('FilterTabs', () => {
  const tabs = [
    { id: 'all', label: 'All', count: 100 },
    { id: 'original', label: 'Original', count: 60 },
    { id: 'forks', label: 'Forks', count: 40 },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all filter tabs', () => {
    const handleTabChange = vi.fn()
    render(<FilterTabs activeTab="all" onTabChange={handleTabChange} tabs={tabs} />)

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /original/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /forks/i })).toBeInTheDocument()
  })

  it('highlights active tab', () => {
    const handleTabChange = vi.fn()
    render(<FilterTabs activeTab="forks" onTabChange={handleTabChange} tabs={tabs} />)

    const forksTab = screen.getByRole('button', { name: /forks/i })
    expect(forksTab).toHaveClass('bg-primary', 'text-primary-foreground')
  })

  it('calls onTabChange when tab clicked', async () => {
    const user = userEvent.setup()
    const handleTabChange = vi.fn()
    render(<FilterTabs activeTab="all" onTabChange={handleTabChange} tabs={tabs} />)

    const originalTab = screen.getByRole('button', { name: /original/i })
    await user.click(originalTab)

    expect(handleTabChange).toHaveBeenCalledWith('original')
  })

  it('displays tab counts', () => {
    const handleTabChange = vi.fn()
    render(<FilterTabs activeTab="all" onTabChange={handleTabChange} tabs={tabs} />)

    expect(screen.getByText(/\(100\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(60\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(40\)/)).toBeInTheDocument()
  })

  it('renders tabs without counts', () => {
    const tabsWithoutCounts = [
      { id: 'all', label: 'All' },
      { id: 'original', label: 'Original' },
      { id: 'forks', label: 'Forks' },
    ]
    const handleTabChange = vi.fn()
    render(<FilterTabs activeTab="all" onTabChange={handleTabChange} tabs={tabsWithoutCounts} />)

    expect(screen.queryByText(/\(100\)/)).not.toBeInTheDocument()
  })
})
