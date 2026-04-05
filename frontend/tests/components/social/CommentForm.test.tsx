import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommentForm } from '@/components/social/CommentForm'
import { useSocialStore } from '@/stores/social-store'

// Mock the social store
vi.mock('@/stores/social-store')

describe('CommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea and submit button', () => {
    const mockCreateComment = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      createComment: mockCreateComment,
    } as any)

    render(<CommentForm notebookId={123} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', 'Add a comment...')

    const button = screen.getByRole('button', { name: '' }) // Icon button
    expect(button).toBeInTheDocument()
  })

  it('submits comment', async () => {
    const user = userEvent.setup()
    const mockCreateComment = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      createComment: mockCreateComment,
    } as any)

    render(<CommentForm notebookId={123} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Great notebook!')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockCreateComment).toHaveBeenCalledWith(123, 'Great notebook!', undefined)
  })

  it('validates empty comment', async () => {
    const user = userEvent.setup()
    const mockCreateComment = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      createComment: mockCreateComment,
    } as any)

    render(<CommentForm notebookId={123} />)

    const button = screen.getByRole('button')
    await user.click(button)

    // Should not call createComment with empty content
    expect(mockCreateComment).not.toHaveBeenCalled()
  })

  it('submits reply with parentId', async () => {
    const user = userEvent.setup()
    const mockCreateComment = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      createComment: mockCreateComment,
    } as any)

    render(<CommentForm notebookId={123} parentId={456} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Thanks!')

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockCreateComment).toHaveBeenCalledWith(123, 'Thanks!', 456)
  })

  it('shows cancel button when onCancel provided', () => {
    const mockCreateComment = vi.fn()
    const mockOnCancel = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      createComment: mockCreateComment,
    } as any)

    render(<CommentForm notebookId={123} onCancel={mockOnCancel} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onSubmitted after successful submission', async () => {
    const user = userEvent.setup()
    const mockCreateComment = vi.fn()
    const mockOnSubmitted = vi.fn()
    vi.mocked(useSocialStore).mockReturnValue({
      createComment: mockCreateComment,
    } as any)

    render(<CommentForm notebookId={123} onSubmitted={mockOnSubmitted} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Great content!')

    const button = screen.getByRole('button')
    await user.click(button)

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockOnSubmitted).toHaveBeenCalled()
  })
})
