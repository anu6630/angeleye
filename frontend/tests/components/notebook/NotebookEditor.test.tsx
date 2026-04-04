import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { useNotebookStore } from '@/stores/notebook-store';
import { useCompilationStore } from '@/stores/compilation-store';

// Mock the stores
vi.mock('@/stores/notebook-store');
vi.mock('@/stores/compilation-store');

// Mock pyodide loader
vi.mock('@/lib/pyodide-loader', () => ({
  loadPyodideInstance: vi.fn().mockResolvedValue({
    runPythonAsync: vi.fn(),
  }),
}));

// Monaco editor is hard to test, mock it
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotebookStore).mockReturnValue(mockNotebookStore as any);
    vi.mocked(useCompilationStore).mockReturnValue(mockCompilationStore as any);
  });

  describe('Rendering', () => {
    it('renders editor with title input', () => {
      render(<NotebookEditor />);

      expect(screen.getByPlaceholderText('Notebook title')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<NotebookEditor />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /compile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
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

      expect(screen.getByText(/code/i)).toBeInTheDocument();
    });
  });

  describe('Title editing', () => {
    it('updates title when typing', async () => {
      const user = userEvent.setup();
      render(<NotebookEditor />);

      const titleInput = screen.getByPlaceholderText('Notebook title');
      await user.type(titleInput, 'My Notebook');

      expect(mockNotebookStore.setTitle).toHaveBeenCalledWith('My Notebook');
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

    it('disables Save button when already saving', () => {
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        isSaving: true,
      } as any);

      render(<NotebookEditor />);

      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Compile and Publish buttons', () => {
    it('opens compile dialog when Compile clicked', async () => {
      const user = userEvent.setup();
      render(<NotebookEditor />);

      const compileButton = screen.getByRole('button', { name: /compile/i });
      await user.click(compileButton);

      // Dialog should be rendered
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens publish dialog when Publish clicked', async () => {
      const user = userEvent.setup();
      render(<NotebookEditor />);

      const publishButton = screen.getByRole('button', { name: /publish/i });
      await user.click(publishButton);

      // Dialog should be rendered
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('disables Publish button when compilation not successful', () => {
      vi.mocked(useCompilationStore).mockReturnValue({
        compilationStatus: 'idle',
      } as any);

      render(<NotebookEditor />);

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).toBeDisabled();
    });

    it('enables Publish button when compilation successful', () => {
      vi.mocked(useCompilationStore).mockReturnValue({
        compilationStatus: 'success',
      } as any);

      render(<NotebookEditor />);

      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).not.toBeDisabled();
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

    it('calls addCell with markdown when Markdown Cell button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(useNotebookStore).mockReturnValue({
        ...mockNotebookStore,
        cells: [{ id: 'cell-1', cell_type: 'code' as const, content: '', isRunning: false }],
      } as any);

      render(<NotebookEditor />);

      const addMarkdownButton = screen.getByRole('button', { name: /\+ markdown cell/i });
      await user.click(addMarkdownButton);

      expect(mockNotebookStore.addCell).toHaveBeenCalledWith('markdown');
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
