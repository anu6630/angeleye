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

interface NotebookState {
  cells: NotebookCellState[];
  title: string;
  notebookId: number | null;
  isSaving: boolean;
  isPublished: boolean;

  // Actions
  setTitle: (title: string) => void;
  setNotebookId: (id: number | null) => void;
  setPublished: (isPublished: boolean) => void;
  addCell: (cellType?: 'code' | 'markdown') => void;
  updateCellCode: (id: string, code: string) => void;
  deleteCell: (id: string) => void;
  executeCell: (id: string, pyodide: any) => Promise<void>;
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
          // Pyodide execution - will be implemented with pyodide-loader in Plan 04
          const result = await pyodide.runPythonAsync(cell.content);
          set((state) => ({
            cells: state.cells.map((c) =>
              c.id === id ? { ...c, isRunning: false, output: String(result) } : c
            ),
          }));
        } catch (error: any) {
          set((state) => ({
            cells: state.cells.map((c) =>
              c.id === id ? { ...c, isRunning: false, error: error.message } : c
            ),
          }));
        }
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
        }),
    }),
    {
      name: 'notebook-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cells: state.cells,
        title: state.title,
        notebookId: state.notebookId,
      }),
    }
  )
);
