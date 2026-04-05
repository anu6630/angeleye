import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchBar } from '@/components/search/SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input', () => {
    const handleSearch = vi.fn()
    render(<SearchBar onSearch={handleSearch} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Search notebooks...')
  })

  it('updates search query on input', async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    render(<SearchBar onSearch={handleSearch} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'python')

    expect(input).toHaveValue('python')
  })

  it('calls onSearch after debounce delay', async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    render(<SearchBar onSearch={handleSearch} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'python')

    // Wait for debounce (300ms)
    await new Promise(resolve => setTimeout(resolve, 350))

    expect(handleSearch).toHaveBeenCalledWith('python')
  })

  it('handles form submission', async () => {
    const user = userEvent.setup()
    const handleSearch = vi.fn()
    render(<SearchBar onSearch={handleSearch} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'data{Enter}')

    // Form submission triggers immediate search
    expect(handleSearch).toHaveBeenCalledWith('data')
  })

  it('renders with default value', () => {
    const handleSearch = vi.fn()
    render(<SearchBar onSearch={handleSearch} defaultValue="python" />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('python')
  })
})
