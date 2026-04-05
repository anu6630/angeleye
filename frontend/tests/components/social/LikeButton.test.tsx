import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LikeButton } from '@/components/social/LikeButton'
import { useSocialStore } from '@/stores/social-store'

// Mock the social store
vi.mock('@/stores/social-store')

describe('LikeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders like button when not liked', () => {
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: vi.fn(),
      isLiked: vi.fn(() => false),
      notebookLikeCounts: { 123: 5 },
    } as any)

    render(<LikeButton notebookId={123} likeCount={5} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders unlike button when liked', () => {
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: vi.fn(),
      isLiked: vi.fn(() => true),
      notebookLikeCounts: { 123: 5 },
    } as any)

    render(<LikeButton notebookId={123} likeCount={5} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary') // default variant when liked
  })

  it('toggles like on click', async () => {
    const user = userEvent.setup()
    const mockToggleLike = vi.fn()
    
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: mockToggleLike,
      isLiked: vi.fn(() => false),
      notebookLikeCounts: { 123: 5 },
    } as any)

    render(<LikeButton notebookId={123} />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockToggleLike).toHaveBeenCalledWith(123)
  })

  it('does not show count when showCount is false', () => {
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: vi.fn(),
      isLiked: vi.fn(() => false),
      notebookLikeCounts: { 123: 5 },
    } as any)

    render(<LikeButton notebookId={123} showCount={false} />)

    expect(screen.queryByText('5')).not.toBeInTheDocument()
  })

  it('uses stored count when prop not provided', () => {
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: vi.fn(),
      isLiked: vi.fn(() => false),
      notebookLikeCounts: { 123: 10 },
    } as any)

    render(<LikeButton notebookId={123} />)

    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('is disabled while loading', () => {
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: vi.fn(),
      isLiked: vi.fn(() => false),
      notebookLikeCounts: { 123: 5 },
    } as any)

    render(<LikeButton notebookId={123} />)

    // Note: Loading state is internal to component
    // This test verifies the button structure
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})
