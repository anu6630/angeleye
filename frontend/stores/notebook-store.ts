import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient, NotebookCell, NotebookResponse } from '@/lib/api-client';

interface NotebookCellState {
  id: string;
  cell_type: 'code' | 'markdown';
  content: string;
  output?: string;
  error?: string;
  isRunning: boolean;
}

interface AttachedDataset {
  /** The browser File object — holds the raw bytes for Pyodide FS mounting */
  file: File;
  /** Original filename, used as the path in Pyodide FS (/home/pyodide/<name>) */
  name: string;
}

interface NotebookState {
  cells: NotebookCellState[];
  title: string;
  notebookId: number | null;
  isSaving: boolean;
  isPublished: boolean;
  /** Local file attached for WASM execution (separate from S3 datasets used at publish time) */
  attachedDataset: AttachedDataset | null;
  isRunningAll: boolean;

  // Actions
  setTitle: (title: string) => void;
  setNotebookId: (id: number | null) => void;
  setPublished: (isPublished: boolean) => void;
  addCell: (cellType?: 'code' | 'markdown') => void;
  updateCellCode: (id: string, code: string) => void;
  updateCellType: (id: string, cellType: 'code' | 'markdown') => void;
  deleteCell: (id: string) => void;
  executeCell: (id: string, pyodide: any) => Promise<void>;
  /** Run all code cells top-to-bottom in the shared Pyodide instance */
  runAll: (pyodide: any) => Promise<void>;
  /** Attach a local file to Pyodide FS for data-dependent notebooks */
  attachDataset: (file: File, pyodide: any | null) => Promise<void>;
  /** Remove the attached file from Pyodide FS */
  detachDataset: (pyodide: any | null) => void;
  saveNotebook: () => Promise<void>;
  publishNotebook: () => Promise<void>;
  loadNotebook: (id: number) => Promise<void>;
  reset: () => void;
}

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set, get) => ({
      cells: [],
      title: 'Untitled Notebook',
      notebookId: null,
      isSaving: false,
      isPublished: false,
      attachedDataset: null,
      isRunningAll: false,

      setTitle: (title) => set({ title }),

      setNotebookId: (id) => set({ notebookId: id }),

      setPublished: (isPublished) => set({ isPublished }),

      addCell: (cellType = 'code') =>
        set((state) => ({
          cells: [
            ...state.cells,
            {
              id: crypto.randomUUID(),
              cell_type: cellType,
              content: '',
              isRunning: false,
            },
          ],
        })),

      updateCellCode: (id, code) =>
        set((state) => ({
          cells: state.cells.map((cell) =>
            cell.id === id ? { ...cell, content: code, output: undefined, error: undefined } : cell
          ),
        })),

      updateCellType: (id, cellType) =>
        set((state) => ({
          cells: state.cells.map((cell) =>
            cell.id === id ? { ...cell, cell_type: cellType, output: undefined, error: undefined } : cell
          ),
        })),

      deleteCell: (id) =>
        set((state) => ({
          cells: state.cells.filter((cell) => cell.id !== id),
        })),

      executeCell: async (id, pyodide) => {
        set((state) => ({
          cells: state.cells.map((cell) =>
            cell.id === id ? { ...cell, isRunning: true, output: undefined, error: undefined } : cell
          ),
        }));

        const state = get();
        const cell = state.cells.find((c) => c.id === id);

        if (!cell || cell.cell_type !== 'code') {
          set((state) => ({
            cells: state.cells.map((c) => (c.id === id ? { ...c, isRunning: false } : c)),
          }));
          return;
        }

        try {
          // Import and use the executePython function to capture stdout/stderr
          const { executePython } = await import('@/lib/pyodide-loader');
          const result = await executePython(cell.content, pyodide);

          if (result.success) {
            set((state) => ({
              cells: state.cells.map((c) =>
                c.id === id ? { ...c, isRunning: false, output: result.output } : c
              ),
            }));
          } else {
            set((state) => ({
              cells: state.cells.map((c) =>
                c.id === id ? { ...c, isRunning: false, error: result.error } : c
              ),
            }));
          }
        } catch (error: any) {
          set((state) => ({
            cells: state.cells.map((c) =>
              c.id === id ? { ...c, isRunning: false, error: error.message } : c
            ),
          }));
        }
      },

      runAll: async (pyodide) => {
        const state = get();
        const codeCells = state.cells.filter((c) => c.cell_type === 'code');
        if (codeCells.length === 0) return;

        set({ isRunningAll: true });

        // Mount attached dataset before running so pd.read_csv('<name>') works
        if (state.attachedDataset && pyodide) {
          const { mountFileToFS } = await import('@/lib/pyodide-loader');
          try {
            await mountFileToFS(state.attachedDataset.file, pyodide);
          } catch (e) {
            console.warn('Could not mount dataset to Pyodide FS:', e);
          }
        }

        try {
          for (const cell of codeCells) {
            const { executeCell } = get();
            await executeCell(cell.id, pyodide);
          }
        } finally {
          set({ isRunningAll: false });
        }
      },

      attachDataset: async (file, pyodide) => {
        // Unmount previous file if any
        const prev = get().attachedDataset;
        if (prev && pyodide) {
          const { unmountFileFromFS } = await import('@/lib/pyodide-loader');
          unmountFileFromFS(prev.name, pyodide);
        }

        const attached: AttachedDataset = { file, name: file.name };
        set({ attachedDataset: attached });

        // Mount immediately if pyodide is already loaded
        if (pyodide) {
          const { mountFileToFS } = await import('@/lib/pyodide-loader');
          try {
            await mountFileToFS(file, pyodide);
          } catch (e) {
            console.warn('Could not mount dataset to Pyodide FS:', e);
          }
        }
      },

      detachDataset: (pyodide) => {
        const prev = get().attachedDataset;
        if (!prev) return;

        if (pyodide) {
          import('@/lib/pyodide-loader').then(({ unmountFileFromFS }) => {
            unmountFileFromFS(prev.name, pyodide);
          });
        }
        set({ attachedDataset: null });
      },

      saveNotebook: async () => {
        const state = get();
        if (state.isSaving) return;

        set({ isSaving: true });

        try {
          const data = {
            title: state.title,
            cells: state.cells.map((cell, index) => ({
              cell_type: cell.cell_type,
              content: cell.content,
              order_index: index,
            })),
          };

          const response = state.notebookId
            ? await apiClient.updateNotebook(state.notebookId, { title: state.title })
            : await apiClient.createNotebook(data);

          // Persist cell content (title-only update does not save cells)
          const notebookId = response.id || state.notebookId;
          if (notebookId) {
            await apiClient.saveNotebookCells(
              notebookId,
              state.cells.map((cell, index) => ({
                cell_type: cell.cell_type,
                content: cell.content,
                order_index: index,
              }))
            );
          }

          set({ notebookId: response.id, isSaving: false });
        } catch (error) {
          set({ isSaving: false });
          throw error;
        }
      },

      publishNotebook: async () => {
        const state = get();
        if (!state.notebookId) return;

        await state.saveNotebook();
        await apiClient.updateNotebook(state.notebookId, { is_published: true });
        set({ isPublished: true });
      },

      loadNotebook: async (id) => {
        set({ isSaving: true });
        try {
          const response = await apiClient.getNotebook(id);
          set({
            notebookId: response.id,
            title: response.title,
            isPublished: response.is_published,
            cells: (response.cells || []).map((cell) => ({
              id: crypto.randomUUID(),
              cell_type: cell.cell_type,
              content: cell.content,
              isRunning: false,
            })),
            isSaving: false,
          });
        } catch (error) {
          set({ isSaving: false });
          throw error;
        }
      },

      reset: () =>
        set({
          cells: [],
          title: 'Untitled Notebook',
          notebookId: null,
          isSaving: false,
          isPublished: false,
          attachedDataset: null,
          isRunningAll: false,
        }),
    }),
    {
      name: 'notebook-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cells: state.cells,
        title: state.title,
        // attachedDataset (File object) and isRunningAll are not serializable — exclude
      }),
    }
  )
);
