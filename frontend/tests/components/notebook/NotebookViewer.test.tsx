import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookViewer } from '@/components/notebook/NotebookViewer';
import { useSocialStore } from '@/stores/social-store';
import { apiClient } from '@/lib/api-client';

// Mock the social store
vi.mock('@/stores/social-store');

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getNotebook: vi.fn(),
    checkNotebookSaved: vi.fn().mockResolvedValue({ is_saved: false }),
  },
}));

// Mock child components
vi.mock('@/components/notebook/NotebookCellViewer', () => ({
  NotebookCellViewer: ({ cell }: any) => (
    <div data-testid="notebook-cell">{cell.content}</div>
  ),
}));

vi.mock('@/components/social/CommentList', () => ({
  CommentList: ({ notebookId }: any) => (
    <div data-testid="comment-list">Comments for {notebookId}</div>
  ),
}));

vi.mock('@/components/social/ForkButton', () => ({
  ForkButton: ({ notebookId }: any) => (
    <button data-testid="fork-button">Fork {notebookId}</button>
  ),
}));

vi.mock('@/components/social/FollowButton', () => ({
  FollowButton: ({ username }: any) => (
    <button data-testid="follow-button">Follow {username}</button>
  ),
}));

vi.mock('@/components/social/ForkChain', () => ({
  ForkChain: ({ notebookId }: any) => (
    <div data-testid="fork-chain">Fork chain for {notebookId}</div>
  ),
}));

vi.mock('@/components/social/EngagementMetrics', () => ({
  EngagementMetrics: ({ likes, comments, views }: any) => (
    <div data-testid="engagement-metrics">
      {likes} likes, {comments} comments, {views} views
    </div>
  ),
}));

vi.mock('@/hooks/useNotebookPresence', () => ({
  useNotebookPresence: () => ({ onlineViewerCount: null }),
}));

const mockNotebook = {
  id: 123,
  title: 'Test Notebook',
  description: 'This is a test notebook',
  created_at: '2024-01-01T00:00:00Z',
  like_count: 10,
  comment_count: 5,
  view_count: 100,
  user: {
    id: 1,
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  cells: [
    { id: 1, cell_type: 'code', content: 'print("hello")', order_index: 0 },
    { id: 2, cell_type: 'markdown', content: '# Hello', order_index: 1 },
  ],
};

describe('NotebookViewer', () => {
  const mockToggleLike = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSocialStore).mockReturnValue({
      isLiked: vi.fn(() => false),
      toggleLike: mockToggleLike,
    } as any);
  });

  describe('Loading state', () => {
    it('shows loading spinner when loading', () => {
      vi.mocked(apiClient.getNotebook).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<NotebookViewer notebookId={123} />);

      expect(screen.getByText(/loading notebook/i)).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows error message when load fails', async () => {
      vi.mocked(apiClient.getNotebook).mockRejectedValueOnce(new Error('Failed to load'));

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('shows error message when notebook not found', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(null as any);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByText(/notebook not found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notebook display', () => {
    it('renders notebook title', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Test Notebook')).toBeInTheDocument();
      });
    });

    it('renders notebook cells', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        const cells = screen.getAllByTestId('notebook-cell');
        expect(cells).toHaveLength(2);
      });
    });

    it('renders author username', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });
    });

    it('renders engagement metrics', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByTestId('engagement-metrics')).toBeInTheDocument();
        expect(screen.getByText(/10 likes, 5 comments, 100 views/i)).toBeInTheDocument();
      });
    });

    it('renders comments section', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByTestId('comment-list')).toBeInTheDocument();
      });
    });

    it('renders fork button', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByTestId('fork-button')).toBeInTheDocument();
      });
    });

    it('renders follow button', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByTestId('follow-button')).toBeInTheDocument();
      });
    });

    it('renders fork chain', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByTestId('fork-chain')).toBeInTheDocument();
      });
    });
  });

  describe('Like functionality', () => {
    it('calls toggleLike when like button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);
      vi.mocked(useSocialStore).mockReturnValue({
        isLiked: vi.fn(() => false),
        toggleLike: mockToggleLike,
      } as any);

      render(<NotebookViewer notebookId={123} />);

      const likeButton = await screen.findByRole('button', { name: /like/i });
      await user.click(likeButton);

      expect(mockToggleLike).toHaveBeenCalledWith(123);
    });

    it('shows filled heart when notebook is liked', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);
      vi.mocked(useSocialStore).mockReturnValue({
        isLiked: vi.fn(() => true),
        toggleLike: mockToggleLike,
      } as any);

      render(<NotebookViewer notebookId={123} />);

      const likeButton = await screen.findByRole('button', { name: /like/i });
      // When liked, the button should have variant="default" (not outline)
      expect(likeButton.className).toContain('bg-primary');
    });
  });

  describe('Navigation', () => {
    it('has back to feed link', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back to feed/i });
        expect(backLink).toHaveAttribute('href', '/feed');
      });
    });
  });

  describe('Empty notebook', () => {
    it('renders notebook with no cells', async () => {
      const notebookWithNoCells = {
        ...mockNotebook,
        cells: [],
      };

      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(notebookWithNoCells);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(screen.getByText('Test Notebook')).toBeInTheDocument();
        expect(screen.queryByTestId('notebook-cell')).not.toBeInTheDocument();
      });
    });
  });

  describe('Share functionality', () => {
    it('renders share button', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        const shareButtons = screen.getAllByRole('button').filter(
          button => button.querySelector('svg') && !button.textContent
        );
        expect(shareButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('API calls', () => {
    it('calls getNotebook with correct ID on mount', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(apiClient.getNotebook).toHaveBeenCalledWith(123);
      });
    });

    it('calls getNotebook again when notebookId changes', async () => {
      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockNotebook);

      const { rerender } = render(<NotebookViewer notebookId={123} />);

      await waitFor(() => {
        expect(apiClient.getNotebook).toHaveBeenCalledWith(123);
      });

      vi.clearAllMocks();

      rerender(<NotebookViewer notebookId={456} />);

      await waitFor(() => {
        expect(apiClient.getNotebook).toHaveBeenCalledWith(456);
      });
    });
  });
});
