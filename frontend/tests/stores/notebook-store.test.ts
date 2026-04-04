import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotebookStore } from '@/stores/notebook-store';
import { apiClient } from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    createNotebook: vi.fn(),
    updateNotebook: vi.fn(),
    getNotebook: vi.fn(),
  },
  NotebookCell: {},
  NotebookResponse: {},
}));

describe('NotebookStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useNotebookStore.setState({
      cells: [],
      title: 'Untitled Notebook',
      notebookId: null,
      isSaving: false,
      isPublished: false,
    });
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('has correct initial state', () => {
      const state = useNotebookStore.getState();

      expect(state.cells).toEqual([]);
      expect(state.title).toBe('Untitled Notebook');
      expect(state.notebookId).toBeNull();
      expect(state.isSaving).toBe(false);
      expect(state.isPublished).toBe(false);
    });
  });

  describe('setTitle', () => {
    it('updates title', () => {
      const store = useNotebookStore.getState();

      store.setTitle('My Notebook');

      expect(useNotebookStore.getState().title).toBe('My Notebook');
    });
  });

  describe('setNotebookId', () => {
    it('updates notebook ID', () => {
      const store = useNotebookStore.getState();

      store.setNotebookId(123);

      expect(useNotebookStore.getState().notebookId).toBe(123);
    });
  });

  describe('setPublished', () => {
    it('updates published status', () => {
      const store = useNotebookStore.getState();

      store.setPublished(true);

      expect(useNotebookStore.getState().isPublished).toBe(true);
    });
  });

  describe('addCell', () => {
    it('adds code cell by default', () => {
      const store = useNotebookStore.getState();

      store.addCell();

      const state = useNotebookStore.getState();
      expect(state.cells).toHaveLength(1);
      expect(state.cells[0].cell_type).toBe('code');
      expect(state.cells[0].content).toBe('');
      expect(state.cells[0].isRunning).toBe(false);
      expect(state.cells[0].id).toBeTruthy();
    });

    it('adds markdown cell when specified', () => {
      const store = useNotebookStore.getState();

      store.addCell('markdown');

      const state = useNotebookStore.getState();
      expect(state.cells).toHaveLength(1);
      expect(state.cells[0].cell_type).toBe('markdown');
    });

    it('appends cell to existing cells', () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'code', content: 'print(1)', isRunning: false }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const store = useNotebookStore.getState();
      store.addCell('code');

      const state = useNotebookStore.getState();
      expect(state.cells).toHaveLength(2);
      expect(state.cells[1].cell_type).toBe('code');
    });
  });

  describe('updateCellCode', () => {
    it('updates cell content', () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'code', content: 'old code', isRunning: false }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const store = useNotebookStore.getState();
      store.updateCellCode('cell-1', 'new code');

      const state = useNotebookStore.getState();
      expect(state.cells[0].content).toBe('new code');
    });

    it('clears output and error when updating code', () => {
      useNotebookStore.setState({
        cells: [{
          id: 'cell-1',
          cell_type: 'code',
          content: 'old code',
          output: 'old output',
          error: 'old error',
          isRunning: false,
        }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const store = useNotebookStore.getState();
      store.updateCellCode('cell-1', 'new code');

      const state = useNotebookStore.getState();
      expect(state.cells[0].output).toBeUndefined();
      expect(state.cells[0].error).toBeUndefined();
    });

    it('does not affect other cells', () => {
      useNotebookStore.setState({
        cells: [
          { id: 'cell-1', cell_type: 'code', content: 'code 1', isRunning: false },
          { id: 'cell-2', cell_type: 'code', content: 'code 2', isRunning: false },
        ],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const store = useNotebookStore.getState();
      store.updateCellCode('cell-1', 'updated code 1');

      const state = useNotebookStore.getState();
      expect(state.cells[0].content).toBe('updated code 1');
      expect(state.cells[1].content).toBe('code 2');
    });
  });

  describe('deleteCell', () => {
    it('deletes cell by ID', () => {
      useNotebookStore.setState({
        cells: [
          { id: 'cell-1', cell_type: 'code', content: 'code 1', isRunning: false },
          { id: 'cell-2', cell_type: 'code', content: 'code 2', isRunning: false },
        ],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const store = useNotebookStore.getState();
      store.deleteCell('cell-1');

      const state = useNotebookStore.getState();
      expect(state.cells).toHaveLength(1);
      expect(state.cells[0].id).toBe('cell-2');
    });
  });

  describe('executeCell', () => {
    it('sets isRunning to true during execution', async () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'code', content: 'print(1)', isRunning: false }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const mockPyodide = {
        runPythonAsync: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      };

      const store = useNotebookStore.getState();
      store.executeCell('cell-1', mockPyodide);

      expect(useNotebookStore.getState().cells[0].isRunning).toBe(true);
    });

    it('sets output on successful execution', async () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'code', content: 'print(1)', isRunning: false }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const mockPyodide = {
        runPythonAsync: vi.fn().mockResolvedValueOnce('output'),
      };

      const store = useNotebookStore.getState();
      await store.executeCell('cell-1', mockPyodide);

      const state = useNotebookStore.getState();
      expect(state.cells[0].isRunning).toBe(false);
      expect(state.cells[0].output).toBe('output');
      expect(state.cells[0].error).toBeUndefined();
    });

    it('sets error on failed execution', async () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'code', content: 'print(1)', isRunning: false }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const mockPyodide = {
        runPythonAsync: vi.fn().mockRejectedValueOnce(new Error('Syntax error')),
      };

      const store = useNotebookStore.getState();
      await store.executeCell('cell-1', mockPyodide);

      const state = useNotebookStore.getState();
      expect(state.cells[0].isRunning).toBe(false);
      expect(state.cells[0].error).toBe('Syntax error');
    });

    it('does not execute markdown cells', async () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'markdown', content: 'text', isRunning: false }],
        title: 'Test',
        notebookId: null,
        isSaving: false,
        isPublished: false,
      });

      const mockPyodide = {
        runPythonAsync: vi.fn(),
      };

      const store = useNotebookStore.getState();
      await store.executeCell('cell-1', mockPyodide);

      expect(mockPyodide.runPythonAsync).not.toHaveBeenCalled();
      expect(useNotebookStore.getState().cells[0].isRunning).toBe(false);
    });
  });

  describe('saveNotebook', () => {
    it('creates new notebook when no notebookId', async () => {
      const mockResponse = { id: 123 };
      vi.mocked(apiClient.createNotebook).mockResolvedValueOnce(mockResponse);

      const store = useNotebookStore.getState();
      await store.saveNotebook();

      expect(apiClient.createNotebook).toHaveBeenCalled();
      expect(useNotebookStore.getState().notebookId).toBe(123);
      expect(useNotebookStore.getState().isSaving).toBe(false);
    });

    it('updates existing notebook when notebookId exists', async () => {
      useNotebookStore.setState({
        cells: [],
        title: 'Test',
        notebookId: 123,
        isSaving: false,
        isPublished: false,
      });

      const mockResponse = { id: 123 };
      vi.mocked(apiClient.updateNotebook).mockResolvedValueOnce(mockResponse);

      const store = useNotebookStore.getState();
      await store.saveNotebook();

      expect(apiClient.updateNotebook).toHaveBeenCalledWith(123, { title: 'Test' });
      expect(useNotebookStore.getState().isSaving).toBe(false);
    });

    it('sets isSaving to true during save', async () => {
      vi.mocked(apiClient.createNotebook).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const store = useNotebookStore.getState();
      store.saveNotebook();

      expect(useNotebookStore.getState().isSaving).toBe(true);
    });

    it('handles save errors', async () => {
      const mockError = new Error('Save failed');
      vi.mocked(apiClient.createNotebook).mockRejectedValueOnce(mockError);

      const store = useNotebookStore.getState();

      await expect(store.saveNotebook()).rejects.toThrow('Save failed');
      expect(useNotebookStore.getState().isSaving).toBe(false);
    });

    it('does not save if already saving', async () => {
      useNotebookStore.setState({
        cells: [],
        title: 'Test',
        notebookId: null,
        isSaving: true,
        isPublished: false,
      });

      vi.mocked(apiClient.createNotebook).mockResolvedValueOnce({ id: 123 });

      const store = useNotebookStore.getState();
      await store.saveNotebook();

      expect(apiClient.createNotebook).not.toHaveBeenCalled();
    });
  });

  describe('publishNotebook', () => {
    it('saves and publishes notebook', async () => {
      useNotebookStore.setState({
        cells: [],
        title: 'Test',
        notebookId: 123,
        isSaving: false,
        isPublished: false,
      });

      vi.mocked(apiClient.updateNotebook).mockResolvedValueOnce({ id: 123 });

      const store = useNotebookStore.getState();
      vi.spyOn(store, 'saveNotebook').mockResolvedValueOnce(undefined);

      await store.publishNotebook();

      expect(store.saveNotebook).toHaveBeenCalled();
      expect(apiClient.updateNotebook).toHaveBeenCalledWith(123, { is_published: true });
      expect(useNotebookStore.getState().isPublished).toBe(true);
    });

    it('does not publish if no notebookId', async () => {
      vi.mocked(apiClient.updateNotebook).mockResolvedValueOnce({ id: 123 });

      const store = useNotebookStore.getState();
      await store.publishNotebook();

      expect(apiClient.updateNotebook).not.toHaveBeenCalled();
    });
  });

  describe('loadNotebook', () => {
    it('loads notebook and updates state', async () => {
      const mockResponse = {
        id: 123,
        title: 'Loaded Notebook',
        is_published: true,
        cells: [
          { cell_type: 'code', content: 'print(1)', order_index: 0 },
          { cell_type: 'markdown', content: 'text', order_index: 1 },
        ],
      };

      vi.mocked(apiClient.getNotebook).mockResolvedValueOnce(mockResponse);

      const store = useNotebookStore.getState();
      await store.loadNotebook(123);

      expect(apiClient.getNotebook).toHaveBeenCalledWith(123);
      const state = useNotebookStore.getState();
      expect(state.notebookId).toBe(123);
      expect(state.title).toBe('Loaded Notebook');
      expect(state.isPublished).toBe(true);
      expect(state.cells).toHaveLength(2);
      expect(state.cells[0].cell_type).toBe('code');
      expect(state.cells[1].cell_type).toBe('markdown');
    });

    it('handles load errors', async () => {
      const mockError = new Error('Load failed');
      vi.mocked(apiClient.getNotebook).mockRejectedValueOnce(mockError);

      const store = useNotebookStore.getState();

      await expect(store.loadNotebook(123)).rejects.toThrow('Load failed');
      expect(useNotebookStore.getState().isSaving).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets store to initial state', () => {
      useNotebookStore.setState({
        cells: [{ id: 'cell-1', cell_type: 'code', content: 'code', isRunning: false }],
        title: 'Custom Title',
        notebookId: 123,
        isSaving: true,
        isPublished: true,
      });

      const store = useNotebookStore.getState();
      store.reset();

      const state = useNotebookStore.getState();
      expect(state.cells).toEqual([]);
      expect(state.title).toBe('Untitled Notebook');
      expect(state.notebookId).toBeNull();
      expect(state.isSaving).toBe(false);
      expect(state.isPublished).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('persists cells, title, and notebookId to localStorage', () => {
      const mockCells = [
        { id: 'cell-1', cell_type: 'code', content: 'print(1)', isRunning: false },
      ];

      useNotebookStore.setState({
        cells: mockCells,
        title: 'Test Notebook',
        notebookId: 123,
        isSaving: false,
        isPublished: false,
      });

      const storedData = localStorage.getItem('notebook-storage');
      expect(storedData).toBeTruthy();

      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.cells).toEqual(mockCells);
        expect(parsed.state.title).toBe('Test Notebook');
        expect(parsed.state.notebookId).toBe(123);
      }
    });

    it('does not persist isSaving and isPublished', () => {
      useNotebookStore.setState({
        cells: [],
        title: 'Test',
        notebookId: null,
        isSaving: true,
        isPublished: true,
      });

      const storedData = localStorage.getItem('notebook-storage');
      expect(storedData).toBeTruthy();

      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.isSaving).toBeUndefined();
        expect(parsed.state.isPublished).toBeUndefined();
      }
    });
  });
});
