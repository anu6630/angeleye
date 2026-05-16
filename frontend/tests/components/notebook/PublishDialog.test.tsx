import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishDialog } from '@/components/notebook/PublishDialog';
import { useCompilationStore } from '@/stores/compilation-store';
import { useNotebookStore } from '@/stores/notebook-store';
import { apiClient } from '@/lib/api-client';

vi.mock('@/stores/compilation-store');
vi.mock('@/stores/notebook-store', () => ({
  useNotebookStore: vi.fn(),
}));
vi.mock('@/lib/api-client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...mod,
    apiClient: {
      ...mod.apiClient,
      getMyGroupsHub: vi.fn(),
    },
  };
});
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('PublishDialog', () => {
  const mockCompile = vi.fn();
  const mockPublish = vi.fn();
  let getStateSnapshot: {
    compilationStatus: string;
    outputKey: string | null;
    compilationResult: { error?: string } | null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotebookStore).mockReturnValue({
      saveNotebook: vi.fn().mockResolvedValue(undefined),
    } as any);
    vi.mocked(apiClient.getMyGroupsHub).mockResolvedValue({
      groups: [],
      pending_invites: [],
      pending_admin_promotions: [],
    });
    getStateSnapshot = {
      compilationStatus: 'idle',
      outputKey: null,
      compilationResult: null,
    };
    vi.mocked(useCompilationStore).mockReturnValue({
      isCompiling: false,
      compilationStatus: 'idle',
      compilationResult: null,
      datasets: [],
      isLoadingDatasets: false,
      compileNotebook: mockCompile,
      loadDatasets: vi.fn(),
      publishNotebook: mockPublish,
      outputUrl: null,
      outputKey: null,
    } as any);
    (useCompilationStore as unknown as { getState: () => typeof getStateSnapshot }).getState = () =>
      getStateSnapshot;
  });

  it('renders when open', () => {
    render(<PublishDialog open={true} onOpenChange={vi.fn()} notebookId={123} />);
    expect(screen.getByRole('heading', { name: /publish to feed/i })).toBeInTheDocument();
  });

  it('runs compile then publish when Publish is clicked', async () => {
    const user = userEvent.setup();
    mockCompile.mockImplementation(async () => {
      getStateSnapshot = {
        compilationStatus: 'success',
        outputKey: 'output-key',
        compilationResult: null,
      };
    });
    mockPublish.mockResolvedValue(undefined);

    render(<PublishDialog open={true} onOpenChange={vi.fn()} notebookId={123} />);

    await user.click(screen.getByRole('button', { name: /^publish$/i }));

    await waitFor(() => {
      expect(mockCompile).toHaveBeenCalledWith(123, undefined);
      expect(mockPublish).toHaveBeenCalledWith(123, 'output-key', undefined, null);
    });
  });

  it('shows audience selector and passes group_id to publish when a group is selected', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.getMyGroupsHub).mockResolvedValue({
      groups: [
        {
          id: 7,
          name: 'Chem',
          slug: 'chem',
          member_count: 2,
          visibility: 'public',
          join_policy: 'open',
          is_member: true,
          is_admin: false,
          can_join: false,
        },
      ],
      pending_invites: [],
      pending_admin_promotions: [],
    });
    mockCompile.mockImplementation(async () => {
      getStateSnapshot = {
        compilationStatus: 'success',
        outputKey: 'output-key',
        compilationResult: null,
      };
    });
    mockPublish.mockResolvedValue(undefined);

    render(<PublishDialog open={true} onOpenChange={vi.fn()} notebookId={123} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/audience/i)).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText(/audience/i), '7');

    await user.click(screen.getByRole('button', { name: /^publish$/i }));

    await waitFor(() => {
      expect(mockPublish).toHaveBeenCalledWith(123, 'output-key', undefined, 7);
    });
  });

  it('does not publish if compile does not produce output', async () => {
    const user = userEvent.setup();
    mockCompile.mockImplementation(async () => {
      getStateSnapshot = {
        compilationStatus: 'failed',
        outputKey: null,
        compilationResult: { error: 'bad' },
      };
    });

    render(<PublishDialog open={true} onOpenChange={vi.fn()} notebookId={123} />);

    await user.click(screen.getByRole('button', { name: /^publish$/i }));

    await waitFor(() => expect(mockCompile).toHaveBeenCalled());
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
