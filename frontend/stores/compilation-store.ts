import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AsyncCompilationResponse,
  CompilationStatusResponse,
  Dataset,
  PublishRequest,
  PublishResponse
} from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';

interface CompilationState {
  // Current compilation
  isCompiling: boolean;
  currentTaskId: string | null;
  currentNotebookId: number | null;
  compilationStatus: 'idle' | 'pending' | 'processing' | 'success' | 'failed';
  compilationResult: CompilationStatusResponse | null;

  // Datasets
  datasets: Dataset[];
  selectedDatasetId: number | null;
  isLoadingDatasets: boolean;

  // Output preview
  outputUrl: string | null;
  outputKey: string | null;

  // Actions
  compileNotebook: (notebookId: number, datasetId?: number) => Promise<void>;
  pollCompilationStatus: (taskId: string) => Promise<void>;
  resetCompilation: () => void;
  loadDatasets: () => Promise<void>;
  setSelectedDataset: (datasetId: number | null) => void;
  deleteDataset: (id: number) => Promise<void>;
  uploadDataset: (file: File) => Promise<Dataset>;
  publishNotebook: (
    notebookId: number,
    outputKey: string,
    datasetId?: number,
    groupId?: number | null
  ) => Promise<PublishResponse>;
  setOutputPreview: (url: string, key: string) => void;
}

export const useCompilationStore = create<CompilationState>()(
  persist(
    (set, get) => ({
      // Initial state
      isCompiling: false,
      currentTaskId: null,
      currentNotebookId: null,
      compilationStatus: 'idle',
      compilationResult: null,
      datasets: [],
      selectedDatasetId: null,
      isLoadingDatasets: false,
      outputUrl: null,
      outputKey: null,

      compileNotebook: async (notebookId, datasetId) => {
        console.log('🔧 compileNotebook function called with:', { notebookId, datasetId });
        console.log('🔧 Current state before:', get());
        set({ isCompiling: true, compilationStatus: 'pending', currentNotebookId: notebookId });
        console.log('🔧 State after set:', get());

        try {
          // Submit compilation task
          console.log('📤 Submitting compilation task...');
          const response = await apiClient.compileNotebookAsync({
            notebook_id: notebookId,
            dataset_id: datasetId,
          });

          console.log('✅ Compilation task submitted:', response);
          set({
            currentTaskId: response.task_id,
            compilationStatus: 'processing',
          });

          // Start polling for status
          await get().pollCompilationStatus(response.task_id);
        } catch (error) {
          console.error('❌ Compilation failed:', error);
          console.error('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined,
          });
          set({
            isCompiling: false,
            compilationStatus: 'failed',
            compilationResult: { error: String(error), task_id: '', state: 'FAILURE' } as CompilationStatusResponse,
          });
        }
      },

      pollCompilationStatus: async (taskId) => {
        const maxAttempts = 60; // 5 minutes at 5s interval
        const delayMs = 5000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            const status = await apiClient.getCompilationStatus(taskId);
            set({ compilationResult: status });

            const state = String(status.state ?? '').toUpperCase();

            if (state === 'SUCCESS') {
              const result = status.result;
              if (!result) {
                set({
                  isCompiling: false,
                  compilationStatus: 'failed',
                  compilationResult: {
                    error: 'Compilation finished but returned no result',
                    task_id: taskId,
                    state: 'FAILURE',
                  } as CompilationStatusResponse,
                });
                return;
              }
              if (result.status === 'failed') {
                set({
                  isCompiling: false,
                  compilationStatus: 'failed',
                  compilationResult: {
                    ...status,
                    error: result.error ?? 'Compilation failed',
                  } as CompilationStatusResponse,
                });
                return;
              }
              set({
                isCompiling: false,
                compilationStatus: 'success',
                outputUrl: result.output_url ?? null,
                outputKey: result.output_key ?? null,
              });
              return;
            }

            if (state === 'FAILURE' || state === 'REVOKED') {
              set({
                isCompiling: false,
                compilationStatus: 'failed',
                compilationResult: status,
              });
              return;
            }

            await new Promise((r) => setTimeout(r, delayMs));
          } catch (error) {
            console.error('❌ Failed to poll compilation status:', error);
            set({
              isCompiling: false,
              compilationStatus: 'failed',
              compilationResult: {
                error: String(error),
                task_id: taskId,
                state: 'FAILURE',
              } as CompilationStatusResponse,
            });
            return;
          }
        }

        set({
          isCompiling: false,
          compilationStatus: 'failed',
          compilationResult: {
            error: 'Compilation timeout',
            task_id: taskId,
            state: 'FAILURE',
          } as CompilationStatusResponse,
        });
      },

      resetCompilation: () => {
        set({
          isCompiling: false,
          currentTaskId: null,
          currentNotebookId: null,
          compilationStatus: 'idle',
          compilationResult: null,
          outputUrl: null,
          outputKey: null,
        });
      },

      loadDatasets: async () => {
        set({ isLoadingDatasets: true });
        try {
          const response = await apiClient.getDatasets();
          set({ datasets: response.datasets, isLoadingDatasets: false });
        } catch (error) {
          console.error('Failed to load datasets:', error);
          set({ isLoadingDatasets: false });
        }
      },

      setSelectedDataset: (datasetId) => {
        set({ selectedDatasetId: datasetId });
      },

      deleteDataset: async (id) => {
        try {
          await apiClient.deleteDataset(id);
          // Reload datasets after deletion
          await get().loadDatasets();
        } catch (error) {
          console.error('Failed to delete dataset:', error);
          throw error;
        }
      },

      uploadDataset: async (file: File) => {
        try {
          const dataset = await apiClient.uploadDataset(file);
          // Reload datasets after upload
          await get().loadDatasets();
          return dataset;
        } catch (error) {
          console.error('Failed to upload dataset:', error);
          throw error;
        }
      },

      publishNotebook: async (notebookId, outputKey, datasetId, groupId) => {
        try {
          const request: PublishRequest = {
            notebook_id: notebookId,
            output_key: outputKey,
            auto_invalidate: true,
          };
          if (datasetId !== undefined) {
            request.dataset_id = datasetId;
          }
          if (groupId !== undefined && groupId !== null) {
            request.group_id = groupId;
          }

          const response = await apiClient.publishNotebook(request);

          // Update notebook published status via notebook store
          const { useNotebookStore } = await import('@/stores/notebook-store');
          const notebookStore = useNotebookStore.getState();
          if (notebookStore.setPublished) {
            notebookStore.setPublished(true);
          }

          return response;
        } catch (error) {
          console.error('Failed to publish notebook:', error);
          throw error;
        }
      },

      setOutputPreview: (url, key) => {
        set({ outputUrl: url, outputKey: key });
      },
    }),
    {
      // Bumped name so stale entries that persisted compilationStatus "failed"
      // without compilationResult no longer show "Unknown error" after reload.
      name: 'compilation-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        compilationStatus:
          state.compilationStatus === 'success' ? 'success' : 'idle',
        outputUrl: state.outputUrl,
        outputKey: state.outputKey,
        currentNotebookId: state.currentNotebookId,
      }),
    }
  )
);

// Expose store to window for debugging
if (typeof window !== 'undefined') {
  // Need to create the store first, then expose it
  const store = useCompilationStore;
  (window as any).useCompilationStore = store;
  console.log('📦 Compilation store exposed to window');
}
