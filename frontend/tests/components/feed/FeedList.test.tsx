import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FeedList } from '@/components/feed/FeedList'
import { useFeedStore } from '@/stores/feed-store'

// Mock the feed store
vi.mock('@/stores/feed-store')

describe('FeedList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no notebooks', () => {
    vi.mocked(useFeedStore).mockReturnValue({
      notebooks: [],
      isLoading: false,
      hasMore: true,
      error: null,
      loadFeed: vi.fn(),
      loadMore: vi.fn(),
    } as any)

    render(<FeedList />)

    expect(screen.getByText(/no notebooks yet/i)).toBeInTheDocument()
  })

  it('renders notebook cards', () => {
    const mockNotebooks = [
      { id: 1, title: 'Notebook 1' },
      { id: 2, title: 'Notebook 2' },
    ]

    vi.mocked(useFeedStore).mockReturnValue({
      notebooks: mockNotebooks,
      isLoading: false,
      hasMore: true,
      error: null,
      loadFeed: vi.fn(),
      loadMore: vi.fn(),
    } as any)

    render(<FeedList />)

    // FeedCard components should be rendered
    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()
  })

  it('renders error state', () => {
    vi.mocked(useFeedStore).mockReturnValue({
      notebooks: [],
      isLoading: false,
      hasMore: true,
      error: 'Network error',
      loadFeed: vi.fn(),
      loadMore: vi.fn(),
    } as any)

    render(<FeedList />)

    expect(screen.getByText(/failed to load feed/i)).toBeInTheDocument()
    expect(screen.getByText(/network error/i)).toBeInTheDocument()
  })

  it('shows end of feed message', () => {
    vi.mocked(useFeedStore).mockReturnValue({
      notebooks: [{ id: 1, title: 'Notebook 1' }],
      isLoading: false,
      hasMore: false,
      error: null,
      loadFeed: vi.fn(),
      loadMore: vi.fn(),
    } as any)

    render(<FeedList />)

    expect(screen.getByText(/you've seen all notebooks/i)).toBeInTheDocument()
  })

  it('calls loadFeed on mount', () => {
    const mockLoadFeed = vi.fn()
    vi.mocked(useFeedStore).mockReturnValue({
      notebooks: [],
      isLoading: false,
      hasMore: true,
      error: null,
      loadFeed: mockLoadFeed,
      loadMore: vi.fn(),
    } as any)

    render(<FeedList />)

    expect(mockLoadFeed).toHaveBeenCalled()
  })
})
