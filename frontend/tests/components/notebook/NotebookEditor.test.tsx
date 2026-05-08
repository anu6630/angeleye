import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { useNotebookStore } from '@/stores/notebook-store';
import { useCompilationStore } from '@/stores/compilation-store';

vi.mock('@/stores/notebook-store');
vi.mock('@/stores/compilation-store');

vi.mock('@/lib/pyodide-loader', () => ({
  loadPyodideInstance: vi.fn().mockResolvedValue({
    runPythonAsync: vi.fn(),
  }),
}));

vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

describe('NotebookEditor', () => {
  const mockNotebookStore = {
    cells: [],
    title: 'Test Notebook',
    notebookId: null as number | null,
    isSaving: false,
    isPublished: false,
    setTitle: vi.fn(),
    addCell: vi.fn(),
    deleteCell: vi.fn(),
    executeCell: vi.fn(),
    reset: vi.fn(),
    saveNotebook: vi.fn(),
    publishNotebook: vi.fn(),
    loadNotebook: vi.fn(),
  };

  const mockCompilationStore = {
    compilationStatus: 'idle',
    resetCompilation: vi.fn(),
    isCompiling: false,
    compilationResult: null,
    datasets: [] as unknown[],
    isLoadingDatasets: false,
    compileNotebook: vi.fn(),
    loadDatasets: vi.fn(),
    publishNotebook: vi.fn(),
    outputUrl: null as string | null,
    outputKey: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotebookStore.notebookId = null;
    vi.mocked(useNotebookStore).mockReturnValue(mockNotebookStore as any);
    vi.mocked(useCompilationStore).mockReturnValue(mockCompilationStore as any);
  });

  describe('Rendering', () => {
    it('renders editor with title input', () => {
      render(<NotebookEditor />);
      expect(screen.getByPlaceholderText('Untitled notebook')).toBeInTheDocument();
    });

    it('renders save and publish buttons', () => {
      render(<NotebookEditor />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
    });

    it('renders empty state when no cells', () => {
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        cells: [],
      } as any);

      render(<NotebookEditor />);

      expect(screen.getByText(/no cells yet/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add code cell/i })).toBeInTheDocument();
    });

    it('renders cells when they exist', () => {
      const mockCells = [
        {
          id: 'cell-1',
          cell_type: 'code' as const,
          content: 'print("hello")',
          output: 'hello',
          isRunning: false,
        },
      ];

      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        cells: mockCells,
      } as any);

      render(<NotebookEditor />);

      expect(screen.getByTestId('monaco-editor')).toHaveValue('print("hello")');
    });
  });

  describe('Title editing', () => {
    it('updates title when typing', async () => {
      const user = userEvent.setup();
      render(<NotebookEditor />);

      const titleInput = screen.getByPlaceholderText('Untitled notebook');
      await user.type(titleInput, 'X');

      expect(mockNotebookStore.setTitle).toHaveBeenCalled();
    });
  });

  describe('Save functionality', () => {
    it('saves notebook when Save button clicked', async () => {
      const user = userEvent.setup();
      mockNotebookStore.saveNotebook.mockResolvedValueOnce(undefined);

      render(<NotebookEditor />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockNotebookStore.saveNotebook).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when saving', () => {
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        isSaving: true,
      } as any);

      render(<NotebookEditor />);

      expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Publish', () => {
    it('opens publish dialog when Publish clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        notebookId: 1,
      } as any);

      render(<NotebookEditor />);

      await user.click(screen.getByRole('button', { name: /^publish$/i }));

      expect(screen.getByRole('heading', { name: /publish to feed/i })).toBeInTheDocument();
    });

    it('disables Publish when notebook not saved', () => {
      render(<NotebookEditor />);

      expect(screen.getByRole('button', { name: /^publish$/i })).toBeDisabled();
    });

    it('enables Publish when store has notebook id', () => {
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        notebookId: 5,
      } as any);

      render(<NotebookEditor />);

      expect(screen.getByRole('button', { name: /^publish$/i })).not.toBeDisabled();
    });

    it('enables Publish when editing existing notebook via prop', () => {
      render(<NotebookEditor notebookId={99} />);

      expect(screen.getByRole('button', { name: /^publish$/i })).not.toBeDisabled();
    });
  });

  describe('Add cell buttons', () => {
    it('shows add cell buttons when cells exist', () => {
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        cells: [{ id: 'cell-1', cell_type: 'code' as const, content: '', isRunning: false }],
      } as any);

      render(<NotebookEditor />);

      expect(screen.getByRole('button', { name: /\+ code cell/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ markdown cell/i })).toBeInTheDocument();
    });

    it('calls addCell with code when Code Cell button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        cells: [{ id: 'cell-1', cell_type: 'code' as const, content: '', isRunning: false }],
      } as any);

      render(<NotebookEditor />);

      const addCodeButton = screen.getByRole('button', { name: /\+ code cell/i });
      await user.click(addCodeButton);

      expect(mockNotebookStore.addCell).toHaveBeenCalledWith('code');
    });
  });

  describe('Notebook loading', () => {
    it('loads notebook when notebookId prop provided', () => {
      render(<NotebookEditor notebookId={123} />);

      expect(mockNotebookStore.loadNotebook).toHaveBeenCalledWith(123);
    });

    it('does not load notebook when notebookId not provided', () => {
      render(<NotebookEditor />);

      expect(mockNotebookStore.loadNotebook).not.toHaveBeenCalled();
    });

    it('resets store on unmount', () => {
      const { unmount } = render(<NotebookEditor notebookId={123} />);

      unmount();

      expect(mockNotebookStore.reset).toHaveBeenCalled();
    });
  });
});
