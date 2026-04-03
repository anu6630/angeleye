import { create } from 'zustand';
import type {
  AsyncCompilationResponse,
  CompilationStatusResponse,
  Dataset,
  PublishRequest
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
  uploadDataset: (file: File) => Promise<void>;
  publishNotebook: (notebookId: number, outputKey: string) => Promise<void>;
  setOutputPreview: (url: string, key: string) => void;
}

export const useCompilationStore = create<CompilationState>()((set, get) => ({
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
    set({ isCompiling: true, compilationStatus: 'pending', currentNotebookId: notebookId });

    try {
      // Submit compilation task
      const response = await apiClient.compileNotebookAsync({
        notebook_id: notebookId,
        dataset_id: datasetId,
      });

      set({
        currentTaskId: response.task_id,
        compilationStatus: 'processing',
      });

      // Start polling for status
      await get().pollCompilationStatus(response.task_id);
    } catch (error) {
      console.error('Compilation failed:', error);
      set({
        isCompiling: false,
        compilationStatus: 'failed',
        compilationResult: { error: String(error), task_id: '', state: 'FAILURE' } as CompilationStatusResponse,
      });
    }
  },

  pollCompilationStatus: async (taskId) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals (PERF-01)
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        const status = await apiClient.getCompilationStatus(taskId);

        set({ compilationResult: status });

        // Check if task is complete
        if (status.state === 'SUCCESS') {
          set({
            isCompiling: false,
            compilationStatus: 'success',
            outputUrl: status.result?.output_url || null,
            outputKey: status.result?.output_key || null,
          });
          return;
        }

        if (status.state === 'FAILURE') {
          set({
            isCompiling: false,
            compilationStatus: 'failed',
          });
          return;
        }

        // Continue polling if not complete
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          set({
            isCompiling: false,
            compilationStatus: 'failed',
            compilationResult: { error: 'Compilation timeout', task_id: taskId, state: 'FAILURE' } as CompilationStatusResponse,
          });
        }
      } catch (error) {
        console.error('Failed to poll compilation status:', error);
        set({
          isCompiling: false,
          compilationStatus: 'failed',
          compilationResult: { error: String(error), task_id: taskId, state: 'FAILURE' } as CompilationStatusResponse,
        });
      }
    };

    poll();
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

  publishNotebook: async (notebookId, outputKey) => {
    try {
      const request: PublishRequest = {
        notebook_id: notebookId,
        output_key: outputKey,
        auto_invalidate: true,
      };

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
}));
