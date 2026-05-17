import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedCard } from '@/components/feed/FeedCard';
import { useSocialStore } from '@/stores/social-store';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/stores/social-store');
vi.mock('@/stores/auth-store');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn() }),
}));

const mockNotebook = {
  id: 42,
  title: 'Test post',
  username: 'writer',
  like_count: 0,
  comment_count: 0,
  created_at: '2024-01-01T00:00:00Z',
};

describe('FeedCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSocialStore).mockReturnValue({
      toggleLike: vi.fn(),
      isLiked: () => false,
      notebookLikeCounts: {},
      isSaved: () => false,
      toggleSave: vi.fn(),
      syncSavedFromCheck: vi.fn(),
      notebookSaveCounts: {},
      seedNotebookSaveCount: vi.fn(),
      setNotebookSaveCount: vi.fn(),
    } as any);
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      user: null,
      isLoading: false,
      pendingUserId: null,
      loginWithGoogle: vi.fn(),
      loginWithFacebook: vi.fn(),
      completeProfile: vi.fn(),
      fetchUser: vi.fn(),
      logout: vi.fn(),
      setPendingUserId: vi.fn(),
    } as any);
  });

  it('report menu links to report page with post id', async () => {
    const user = userEvent.setup();
    render(<FeedCard notebook={mockNotebook} />);

    await user.click(screen.getByRole('button', { name: /more options/i }));

    const report = await screen.findByRole('menuitem', { name: /^report$/i });
    expect(report).toHaveAttribute('href', '/report?postId=42');
  });
});
