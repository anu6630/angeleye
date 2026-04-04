import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotebookCell } from '@/components/notebook/NotebookCell';
import { useNotebookStore } from '@/stores/notebook-store';

// Mock the notebook store
vi.mock('@/stores/notebook-store');

// Mock pyodide loader properly
vi.mock('@/lib/pyodide-loader', () => ({
  loadPyodideInstance: vi.fn().mockResolvedValue({
    runPythonAsync: vi.fn(),
  }),
}));

// Mock Monaco editor
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

describe('NotebookCell', () => {
  const mockUpdateCellCode = vi.fn();

  const defaultProps = {
    id: 'cell-1',
    cell_type: 'code' as const,
    content: 'print("hello")',
    output: undefined,
    error: undefined,
    isRunning: false,
    onRun: vi.fn(),
    onDelete: vi.fn(),
    onAddCell: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotebookStore).mockReturnValue({
      updateCellCode: mockUpdateCellCode,
    } as any);
  });

  describe('Code cell rendering', () => {
    it('renders code cell with Monaco editor', () => {
      render(<NotebookCell {...defaultProps} />);

      expect(screen.getByText(/code/i)).toBeInTheDocument();
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    it('displays cell type in header', () => {
      render(<NotebookCell {...defaultProps} />);

      expect(screen.getByText(/code/i)).toBeInTheDocument();
    });

    it('renders Run button for code cells', () => {
      render(<NotebookCell {...defaultProps} />);

      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });

    it('renders Add Cell button for code cells', () => {
      render(<NotebookCell {...defaultProps} />);

      expect(screen.getByRole('button', { name: /add cell/i })).toBeInTheDocument();
    });

    it('shows "Running..." text when cell is running', () => {
      render(<NotebookCell {...defaultProps} isRunning={true} />);

      expect(screen.getByText(/running\.\.\./i)).toBeInTheDocument();
    });
  });

  describe('Markdown cell rendering', () => {
    it('renders markdown cell with textarea', () => {
      render(<NotebookCell {...defaultProps} cell_type="markdown" />);

      expect(screen.getByText(/markdown/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/write markdown/i)).toBeInTheDocument();
    });

    it('does not show Run button for markdown cells', () => {
      render(<NotebookCell {...defaultProps} cell_type="markdown" />);

      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument();
    });

    it('does not show Add Cell button for markdown cells', () => {
      render(<NotebookCell {...defaultProps} cell_type="markdown" />);

      expect(screen.queryByRole('button', { name: /add cell/i })).not.toBeInTheDocument();
    });
  });

  describe('Cell content editing', () => {
    it('updates code cell content when typing', async () => {
      const user = userEvent.setup();
      render(<NotebookCell {...defaultProps} cell_type="code" content="" />);

      const editor = screen.getByTestId('monaco-editor');

      // Just type without clearing - Monaco will handle the content
      await user.type(editor, 'x');

      expect(mockUpdateCellCode).toHaveBeenCalledWith('cell-1', 'x');
    });

    it('updates markdown cell content when typing', async () => {
      const user = userEvent.setup();
      render(<NotebookCell {...defaultProps} cell_type="markdown" content="" />);

      const textarea = screen.getByPlaceholderText(/write markdown/i);

      // Just type without clearing
      await user.type(textarea, 'x');

      expect(mockUpdateCellCode).toHaveBeenCalledWith('cell-1', 'x');
    });
  });

  describe('Cell actions', () => {
    it('calls onRun when Run button clicked', async () => {
      const user = userEvent.setup();
      const mockOnRun = vi.fn();
      render(<NotebookCell {...defaultProps} onRun={mockOnRun} />);

      const runButton = screen.getByRole('button', { name: /run/i });
      await user.click(runButton);

      expect(mockOnRun).toHaveBeenCalledTimes(1);
    });

    it('calls onAddCell when Add Cell button clicked', async () => {
      const user = userEvent.setup();
      const mockOnAddCell = vi.fn();
      render(<NotebookCell {...defaultProps} onAddCell={mockOnAddCell} />);

      const addButton = screen.getByRole('button', { name: /add cell/i });
      await user.click(addButton);

      expect(mockOnAddCell).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when delete button clicked', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn();
      render(<NotebookCell {...defaultProps} onDelete={mockOnDelete} />);

      const deleteButton = screen.getByRole('button', { name: '' }); // Trash2 icon has no text
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled states', () => {
    it('disables Run button when cell is running', () => {
      render(<NotebookCell {...defaultProps} isRunning={true} />);

      const runButton = screen.getByRole('button', { name: /running\.\.\./i });
      expect(runButton).toBeDisabled();
    });

    it('disables Run button when pyodide not loaded', () => {
      render(<NotebookCell {...defaultProps} />);

      const runButton = screen.getByRole('button', { name: /run/i });
      expect(runButton).toBeDisabled();
    });
  });

  describe('Cell output', () => {
    it('renders output when provided', () => {
      render(<NotebookCell {...defaultProps} output="hello world" />);

      expect(screen.getByText('hello world')).toBeInTheDocument();
    });

    it('renders error when provided', () => {
      render(<NotebookCell {...defaultProps} error="SyntaxError" />);

      expect(screen.getByText(/syntaxerror/i)).toBeInTheDocument();
    });
  });
});
