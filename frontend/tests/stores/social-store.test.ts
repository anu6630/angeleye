import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSocialStore } from '@/stores/social-store'
import { apiClient } from '@/lib/api-client'

// Mock apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    toggleLike: vi.fn(),
    getComments: vi.fn(),
    createComment: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getCurrentUser: vi.fn(),
    getUserFollowing: vi.fn(),
  },
}))

describe('social-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSocialStore.getState().reset()
    vi.clearAllMocks()
  })

  it('has correct initial state', () => {
    const state = useSocialStore.getState()
    expect(state.likedNotebooks).toEqual(new Set())
    expect(state.notebookLikeCounts).toEqual({})
    expect(state.comments).toEqual({})
    expect(state.commentCounts).toEqual({})
    expect(state.isLoading).toBe(false)
    expect(state.loadingNotebooks).toEqual(new Set())
    expect(state.followingIds).toEqual(new Set())
    expect(state.followersCount).toEqual({})
    expect(state.followingCount).toEqual({})
  })

  it('toggles like from not liked to liked', async () => {
    vi.mocked(apiClient.toggleLike).mockResolvedValue({ liked: true, count: 1 })

    const state = useSocialStore.getState()
    await state.toggleLike(123)

    // Get fresh state after async operation
    const newState = useSocialStore.getState()
    expect(newState.likedNotebooks.has(123)).toBe(true)
    expect(newState.notebookLikeCounts[123]).toBe(1)
  })

  it('toggles like from liked to not liked', async () => {
    vi.mocked(apiClient.toggleLike).mockResolvedValue({ liked: false, count: 0 })

    // Set initial liked state
    useSocialStore.setState({
      likedNotebooks: new Set([123]),
      notebookLikeCounts: { 123: 1 },
    })

    const state = useSocialStore.getState()
    await state.toggleLike(123)

    const newState = useSocialStore.getState()
    expect(newState.likedNotebooks.has(123)).toBe(false)
    expect(newState.notebookLikeCounts[123]).toBe(0)
  })

  it('checks if notebook is liked', () => {
    useSocialStore.setState({
      likedNotebooks: new Set([123, 456]),
    })

    const state = useSocialStore.getState()
    expect(state.isLiked(123)).toBe(true)
    expect(state.isLiked(456)).toBe(true)
    expect(state.isLiked(789)).toBe(false)
  })

  it('loads comments', async () => {
    const mockComments = [
      { id: 1, content: 'Test comment', replies: [] },
      { id: 2, content: 'Another comment', replies: [] },
    ]
    vi.mocked(apiClient.getComments).mockResolvedValue(mockComments)

    const state = useSocialStore.getState()
    await state.loadComments(123)

    const newState = useSocialStore.getState()
    expect(newState.comments[123]).toEqual(mockComments)
    expect(newState.commentCounts[123]).toBe(2)
    expect(newState.isLoading).toBe(false)
  })

  it('creates top-level comment', async () => {
    const mockComment = {
      id: 999,
      content: 'New comment',
      user_id: 1,
      username: 'testuser',
      replies: [],
    }
    vi.mocked(apiClient.createComment).mockResolvedValue(mockComment)

    const state = useSocialStore.getState()
    await state.createComment(123, 'New comment')

    const newState = useSocialStore.getState()
    expect(newState.comments[123]).toHaveLength(1)
    expect(newState.comments[123][0].content).toBe('New comment')
    expect(newState.commentCounts[123]).toBe(1)
  })

  it('creates reply comment', async () => {
    const mockComment = {
      id: 999,
      content: 'New reply',
      parent_id: 1,
      replies: [],
    }
    vi.mocked(apiClient.createComment).mockResolvedValue(mockComment)

    // Set existing comments
    useSocialStore.setState({
      comments: {
        123: [
          { id: 1, content: 'Parent comment', replies: [] },
        ],
      },
    })

    const state = useSocialStore.getState()
    await state.createComment(123, 'New reply', 1)

    const newState = useSocialStore.getState()
    expect(newState.comments[123][0].replies).toHaveLength(1)
    expect(newState.comments[123][0].replies[0].content).toBe('New reply')
  })

  it('gets comments for notebook', () => {
    const mockComments = [
      { id: 1, content: 'Test comment', replies: [] },
      { id: 2, content: 'Another comment', replies: [] },
    ]
    useSocialStore.setState({
      comments: { 123: mockComments },
    })

    const state = useSocialStore.getState()
    expect(state.getComments(123)).toEqual(mockComments)
    expect(state.getComments(456)).toEqual([])
  })

  it('gets comment count for notebook', () => {
    useSocialStore.setState({
      commentCounts: { 123: 5, 456: 2 },
    })

    const state = useSocialStore.getState()
    expect(state.getCommentCount(123)).toBe(5)
    expect(state.getCommentCount(456)).toBe(2)
    expect(state.getCommentCount(789)).toBe(0)
  })

  it('sets following IDs', () => {
    const state = useSocialStore.getState()
    state.setFollowingIds([1, 2, 3])

    expect(useSocialStore.getState().followingIds).toEqual(new Set([1, 2, 3]))
  })

  it('toggles follow from not following to following', async () => {
    vi.mocked(apiClient.followUser).mockResolvedValue(undefined)

    const state = useSocialStore.getState()
    await state.toggleFollow(123)

    const newState = useSocialStore.getState()
    expect(newState.followingIds.has(123)).toBe(true)
    expect(apiClient.followUser).toHaveBeenCalledWith(123)
  })

  it('toggles follow from following to not following', async () => {
    vi.mocked(apiClient.unfollowUser).mockResolvedValue(undefined)

    // Set initial following state
    useSocialStore.setState({
      followingIds: new Set([123]),
      followersCount: { 123: 1 },
    })

    const state = useSocialStore.getState()
    await state.toggleFollow(123)

    const newState = useSocialStore.getState()
    expect(newState.followingIds.has(123)).toBe(false)
    expect(apiClient.unfollowUser).toHaveBeenCalledWith(123)
  })

  it('checks if following user', () => {
    useSocialStore.setState({
      followingIds: new Set([123, 456]),
    })

    const state = useSocialStore.getState()
    expect(state.isFollowing(123)).toBe(true)
    expect(state.isFollowing(456)).toBe(true)
    expect(state.isFollowing(789)).toBe(false)
  })

  it('initializes follows from API', async () => {
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue({ id: 1 })
    vi.mocked(apiClient.getUserFollowing).mockResolvedValue({ following_count: 2 })

    const state = useSocialStore.getState()
    await state.initializeFollows()

    // Get fresh state after async operation
    const newState = useSocialStore.getState()
    expect(newState.followingIds).toEqual(new Set())
    expect(newState.followingCount[1]).toBe(2)
  })

  it('resets state', () => {
    useSocialStore.setState({
      likedNotebooks: new Set([123]),
      notebookLikeCounts: { 123: 1 },
      comments: { 123: [] },
      commentCounts: { 123: 1 },
      followingIds: new Set([456]),
      followersCount: { 456: 1 },
      followingCount: { 456: 1 },
    })

    useSocialStore.getState().reset()

    const state = useSocialStore.getState()
    expect(state.likedNotebooks).toEqual(new Set())
    expect(state.notebookLikeCounts).toEqual({})
    expect(state.comments).toEqual({})
    expect(state.commentCounts).toEqual({})
    expect(state.followingIds).toEqual(new Set())
    expect(state.followersCount).toEqual({})
    expect(state.followingCount).toEqual({})
  })
})
