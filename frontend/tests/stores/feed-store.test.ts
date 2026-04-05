import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFeedStore } from '@/stores/feed-store'
import { apiClient } from '@/lib/api-client'

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getFeed: vi.fn(),
  },
}))

describe('feed-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useFeedStore.getState().reset()
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const state = useFeedStore.getState()
    expect(state.notebooks).toEqual([])
    expect(state.cursor).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.hasMore).toBe(true)
    expect(state.error).toBeNull()
  })

  it('loads feed successfully', async () => {
    const mockResponse = {
      items: [
        { id: 1, title: 'Notebook 1' },
        { id: 2, title: 'Notebook 2' },
      ],
      next_cursor: 'cursor123',
      has_more: true,
    }
    vi.mocked(apiClient.getFeed).mockResolvedValue(mockResponse)

    const state = useFeedStore.getState()
    await state.loadFeed()

    const newState = useFeedStore.getState()
    expect(newState.notebooks).toHaveLength(2)
    expect(newState.notebooks[0].id).toBe(1)
    expect(newState.cursor).toBe('cursor123')
    expect(newState.hasMore).toBe(true)
    expect(newState.isLoading).toBe(false)
    expect(newState.error).toBeNull()
  })

  it('handles load feed error', async () => {
    vi.mocked(apiClient.getFeed).mockRejectedValue(new Error('Network error'))

    const state = useFeedStore.getState()
    await state.loadFeed()

    const newState = useFeedStore.getState()
    expect(newState.error).toBe('Network error')
    expect(newState.isLoading).toBe(false)
  })

  it('loads more notebooks', async () => {
    // Set initial state
    useFeedStore.setState({
      notebooks: [
        { id: 1, title: 'Notebook 1' },
      ],
      cursor: 'cursor123',
      hasMore: true,
    })

    const mockResponse = {
      items: [
        { id: 2, title: 'Notebook 2' },
        { id: 3, title: 'Notebook 3' },
      ],
      next_cursor: 'cursor456',
      has_more: true,
    }
    vi.mocked(apiClient.getFeed).mockResolvedValue(mockResponse)

    const state = useFeedStore.getState()
    await state.loadMore()

    const newState = useFeedStore.getState()
    expect(newState.notebooks).toHaveLength(3)
    expect(newState.notebooks[0].id).toBe(1)
    expect(newState.notebooks[1].id).toBe(2)
    expect(newState.notebooks[2].id).toBe(3)
    expect(newState.cursor).toBe('cursor456')
  })

  it('does not load more when already loading', async () => {
    useFeedStore.setState({
      isLoading: true,
      hasMore: true,
    })

    const state = useFeedStore.getState()
    await state.loadMore()

    // loadMore returns early if isLoading, but doesn't prevent the call
    // The implementation checks if isLoading internally
    const callCount = vi.mocked(apiClient.getFeed).mock.calls.length
    expect(callCount).toBe(0)
  })

  it('does not load more when no more notebooks', async () => {
    useFeedStore.setState({
      hasMore: false,
      isLoading: false,
    })

    const state = useFeedStore.getState()
    await state.loadMore()

    // loadMore returns early if hasMore is false
    const callCount = vi.mocked(apiClient.getFeed).mock.calls.length
    expect(callCount).toBe(0)
  })

  it('prepends notebook to feed', () => {
    useFeedStore.setState({
      notebooks: [
        { id: 2, title: 'Notebook 2' },
        { id: 3, title: 'Notebook 3' },
      ],
    })

    const state = useFeedStore.getState()
    state.prependNotebook({ id: 1, title: 'Notebook 1' })

    const newState = useFeedStore.getState()
    expect(newState.notebooks).toHaveLength(3)
    expect(newState.notebooks[0].id).toBe(1)
    expect(newState.notebooks[1].id).toBe(2)
    expect(newState.notebooks[2].id).toBe(3)
  })

  it('updates notebook in feed', () => {
    useFeedStore.setState({
      notebooks: [
        { id: 1, title: 'Old Title' },
        { id: 2, title: 'Notebook 2' },
      ],
    })

    const state = useFeedStore.getState()
    state.updateNotebook(1, { title: 'New Title' })

    const newState = useFeedStore.getState()
    expect(newState.notebooks[0].title).toBe('New Title')
    expect(newState.notebooks[1].title).toBe('Notebook 2')
  })

  it('removes notebook from feed', () => {
    useFeedStore.setState({
      notebooks: [
        { id: 1, title: 'Notebook 1' },
        { id: 2, title: 'Notebook 2' },
        { id: 3, title: 'Notebook 3' },
      ],
    })

    const state = useFeedStore.getState()
    state.removeNotebook(2)

    const newState = useFeedStore.getState()
    expect(newState.notebooks).toHaveLength(2)
    expect(newState.notebooks[0].id).toBe(1)
    expect(newState.notebooks[1].id).toBe(3)
  })

  it('resets state', () => {
    useFeedStore.setState({
      notebooks: [{ id: 1, title: 'Notebook 1' }],
      cursor: 'cursor123',
      isLoading: true,
      hasMore: false,
      error: 'Some error',
    })

    useFeedStore.getState().reset()

    const state = useFeedStore.getState()
    expect(state.notebooks).toEqual([])
    expect(state.cursor).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.hasMore).toBe(true)
    expect(state.error).toBeNull()
  })
})
