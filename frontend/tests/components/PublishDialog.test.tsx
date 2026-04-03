/**
 * Tests for PublishDialog component.
 *
 * TEST-02: Frontend has component tests for UI components
 * NOTE-05: User can publish notebooks
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishDialog } from '@/components/notebook/PublishDialog';

vi.mock('@/stores/compilation-store', () => ({
  useCompilationStore: vi.fn(() => ({
    outputUrl: null,
    outputKey: null,
    compilationStatus: 'idle',
    publishNotebook: vi.fn(),
  })),
}));

describe('PublishDialog', () => {
  it('shows warning when notebook not compiled', () => {
    render(
      <PublishDialog
        open={true}
        onOpenChange={vi.fn()}
        notebookId={1}
      />
    );

    expect(screen.getByText(/must be compiled successfully/)).toBeInTheDocument();
  });

  it('shows publish button when compilation successful', async () => {
    const { useCompilationStore } = await import('@/stores/compilation-store');
    vi.mocked(useCompilationStore).mockReturnValue({
      outputUrl: 'https://example.com/output',
      outputKey: 'notebooks/1/v123/output.html',
      compilationStatus: 'success',
      publishNotebook: vi.fn(),
    } as any);

    render(
      <PublishDialog
        open={true}
        onOpenChange={vi.fn()}
        notebookId={1}
      />
    );

    expect(screen.getByRole('button', { name: /publish to feed/i })).toBeInTheDocument();
  });
});
