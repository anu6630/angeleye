/**
 * Tests for CompilationDialog component.
 *
 * TEST-02: Frontend has component tests for UI components
 * NOTE-04: User can compile notebooks
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CompilationDialog } from '@/components/notebook/CompilationDialog';

// Mock the compilation store
vi.mock('@/stores/compilation-store', () => ({
  useCompilationStore: vi.fn(() => ({
    isCompiling: false,
    compilationStatus: 'idle',
    datasets: [],
    selectedDatasetId: null,
    isLoadingDatasets: false,
    compileNotebook: vi.fn(),
    loadDatasets: vi.fn(),
    setSelectedDataset: vi.fn(),
    resetCompilation: vi.fn(),
  })),
}));

describe('CompilationDialog', () => {
  it('renders compile dialog when open', () => {
    render(
      <CompilationDialog
        open={true}
        onOpenChange={vi.fn()}
        notebookId={1}
      />
    );

    expect(screen.getByText('Compile Notebook')).toBeInTheDocument();
  });

  it('shows empty state when no datasets available', () => {
    render(
      <CompilationDialog
        open={true}
        onOpenChange={vi.fn()}
        notebookId={1}
      />
    );

    expect(screen.getByText(/No datasets uploaded yet/)).toBeInTheDocument();
  });

  it('calls compileNotebook when Compile button clicked', async () => {
    const mockCompile = vi.fn();
    const { useCompilationStore } = await import('@/stores/compilation-store');
    vi.mocked(useCompilationStore).mockReturnValue({
      isCompiling: false,
      compilationStatus: 'idle',
      datasets: [],
      selectedDatasetId: null,
      isLoadingDatasets: false,
      compileNotebook: mockCompile,
      loadDatasets: vi.fn(),
      setSelectedDataset: vi.fn(),
      resetCompilation: vi.fn(),
    } as any);

    render(
      <CompilationDialog
        open={true}
        onOpenChange={vi.fn()}
        notebookId={1}
      />
    );

    const compileButton = screen.getByRole('button', { name: /compile/i });
    compileButton.click();

    await waitFor(() => {
      expect(mockCompile).toHaveBeenCalledWith(1, undefined);
    });
  });
});
