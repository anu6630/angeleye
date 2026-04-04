import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookCard } from '@/components/notebook/NotebookCard';
import { useSocialStore } from '@/stores/social-store';

// Mock the social store
vi.mock('@/stores/social-store');
vi.mock('@/components/notebook/NotebookOutputViewer', () => ({
  InlineNotebookOutput: ({ outputUrl, className }: any) => (
    <div data-testid="notebook-output" className={className}>
      Output preview
    </div>
  ),
}));

const mockNotebook = {
  id: 123,
  title: 'Test Notebook',
  description: 'This is a test notebook',
  created_at: '2024-01-01T00:00:00Z',
  output_url: 'https://example.com/output.html',
  like_count: 10,
  comment_count: 5,
  user: {
    id: 1,
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
  },
};

describe('NotebookCard', () => {
  const mockToggleLike = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSocialStore).mockReturnValue({
      isLiked: vi.fn(() => false),
      toggleLike: mockToggleLike,
    } as any);
  });

  describe('Rendering', () => {
    it('renders notebook title', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByText('Test Notebook')).toBeInTheDocument();
    });

    it('renders notebook description', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByText('This is a test notebook')).toBeInTheDocument();
    });

    it('renders author username', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('renders creation date', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByText(/2024/i)).toBeInTheDocument();
    });

    it('renders like count', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('renders comment count', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders output preview when output_url exists', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      expect(screen.getByTestId('notebook-output')).toBeInTheDocument();
    });

    it('does not render output preview when no output_url', () => {
      const notebookWithoutOutput = { ...mockNotebook, output_url: undefined };
      render(<NotebookCard notebook={notebookWithoutOutput} />);

      expect(screen.queryByTestId('notebook-output')).not.toBeInTheDocument();
    });

    it('renders avatar fallback when no avatar_url', () => {
      const notebookWithoutAvatar = {
        ...mockNotebook,
        user: { ...mockNotebook.user, avatar_url: undefined },
      };

      render(<NotebookCard notebook={notebookWithoutAvatar} />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of username
    });
  });

  describe('Like functionality', () => {
    it('calls toggleLike when like button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useSocialStore).mockReturnValue({
        isLiked: vi.fn(() => false),
        toggleLike: mockToggleLike,
      } as any);

      render(<NotebookCard notebook={mockNotebook} />);

      const likeButton = screen.getByRole('button', { name: /10/i });
      await user.click(likeButton);

      expect(mockToggleLike).toHaveBeenCalledWith(123);
    });

    it('shows filled heart when notebook is liked', () => {
      vi.mocked(useSocialStore).mockReturnValue({
        isLiked: vi.fn(() => true),
        toggleLike: mockToggleLike,
      } as any);

      render(<NotebookCard notebook={mockNotebook} />);

      const likeButton = screen.getByRole('button', { name: /10/i });
      expect(likeButton).toHaveClass('text-red-500');
    });

    it('shows outline heart when notebook is not liked', () => {
      vi.mocked(useSocialStore).mockReturnValue({
        isLiked: vi.fn(() => false),
        toggleLike: mockToggleLike,
      } as any);

      render(<NotebookCard notebook={mockNotebook} />);

      const likeButton = screen.getByRole('button', { name: /10/i });
      expect(likeButton).not.toHaveClass('text-red-500');
    });
  });

  describe('Navigation', () => {
    it('links to notebook detail page', () => {
      render(<NotebookCard notebook={mockNotebook} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/notebooks/123');
    });
  });

  describe('Edge cases', () => {
    it('renders without description', () => {
      const notebookWithoutDescription = { ...mockNotebook, description: undefined };
      render(<NotebookCard notebook={notebookWithoutDescription} />);

      expect(screen.getByText('Test Notebook')).toBeInTheDocument();
    });

    it('renders with zero engagement counts', () => {
      const notebookWithZeroCounts = {
        ...mockNotebook,
        like_count: 0,
        comment_count: 0,
      };

      render(<NotebookCard notebook={notebookWithZeroCounts} />);

      // Should find at least one '0' (for likes or comments)
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThan(0);
    });

    it('renders with unknown user', () => {
      const notebookWithUnknownUser = {
        ...mockNotebook,
        user: undefined,
      };

      render(<NotebookCard notebook={notebookWithUnknownUser} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});
