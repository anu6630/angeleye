import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FollowButton } from '@/components/social/FollowButton'
import { useSocialStore } from '@/stores/social-store'

// Mock the social store
vi.mock('@/stores/social-store')

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders follow button when not following', () => {
    const mockToggleFollow = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      toggleFollow: mockToggleFollow,
      isFollowing: vi.fn(() => false),
    } as any)

    render(<FollowButton userId={123} username="testuser" />)

    const button = screen.getByRole('button', { name: /follow/i })
    expect(button).toBeInTheDocument()
  })

  it('renders following button when following', () => {
    const mockToggleFollow = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      toggleFollow: mockToggleFollow,
      isFollowing: vi.fn(() => true),
    } as any)

    render(<FollowButton userId={123} username="testuser" />)

    const button = screen.getByRole('button', { name: /following/i })
    expect(button).toBeInTheDocument()
  })

  it('toggles follow on click', async () => {
    const user = userEvent.setup()
    const mockToggleFollow = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      toggleFollow: mockToggleFollow,
      isFollowing: vi.fn(() => false),
    } as any)

    render(<FollowButton userId={123} username="testuser" />)

    const button = screen.getByRole('button', { name: /follow/i })
    await user.click(button)

    expect(mockToggleFollow).toHaveBeenCalledWith(123)
  })

  it('hides text when showText is false', () => {
    const mockToggleFollow = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      toggleFollow: mockToggleFollow,
      isFollowing: vi.fn(() => false),
    } as any)

    render(<FollowButton userId={123} username="testuser" showText={false} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.queryByText(/follow/i)).not.toBeInTheDocument()
  })
})
