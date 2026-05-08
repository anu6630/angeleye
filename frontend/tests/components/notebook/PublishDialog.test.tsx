import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishDialog } from '@/components/notebook/PublishDialog';
import { useCompilationStore } from '@/stores/compilation-store';

vi.mock('@/stores/compilation-store');
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
      expect(mockPublish).toHaveBeenCalledWith(123, 'output-key');
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
