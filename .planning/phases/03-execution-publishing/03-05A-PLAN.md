---
phase: 03-execution-publishing
plan: 05A
type: execute
wave: 4
depends_on: ["03-04B"]
files_modified:
  - frontend/lib/api-client.ts
  - frontend/stores/compilation-store.ts
autonomous: true
requirements:
  - NOTE-03
  - NOTE-04
  - NOTE-05
  - PERF-01

must_haves:
  truths:
    - "API client extended with dataset methods (uploadDataset, getDatasets, deleteDataset)"
    - "API client extended with compilation methods (compileNotebookAsync, getCompilationStatus)"
    - "API client extended with publish method (publishNotebook)"
    - "Zustand compilation store manages compilation state"
    - "Polling for task status (5-second intervals, 5-minute timeout)"
  artifacts:
    - path: "frontend/lib/api-client.ts"
      provides: "Extended API client with compilation endpoints"
      exports: ["uploadDataset", "compileNotebookAsync", "getCompilationStatus", "publishNotebook"]
      min_lines: 100
    - path: "frontend/stores/compilation-store.ts"
      provides: "Zustand store for compilation state management"
      exports: ["useCompilationStore"]
      min_lines: 120
  key_links:
    - from: "frontend/stores/compilation-store.ts"
      to: "frontend/lib/api-client.ts"
      via: "API client methods for compilation"
      pattern: "apiClient\\.compile|apiClient\\.uploadDataset"

---

# Phase 03-05A: Frontend API Client and Compilation Store

<objective>
Extend the frontend API client with dataset and compilation endpoints, and create a Zustand store for managing compilation state, dataset selection, and task polling.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@frontend/lib/api-client.ts (existing API client)
@frontend/stores/notebook-store.ts (notebook state management reference)
@frontend/stores/auth-store.ts (auth state reference)

## UI Patterns from Phase 2

- Zustand for state management with persist middleware
- API client with centralized error handling
- TypeScript interfaces for all API contracts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend API client with compilation and dataset endpoints</name>
  <files>
    frontend/lib/api-client.ts
  </files>
  <read_first>
    - frontend/lib/api-client.ts (existing API client)
  </read_first>
  <action>
    Add compilation-related methods to frontend/lib/api-client.ts.

    First, add TypeScript interfaces at the top of the file (after existing interfaces):
    ```typescript
    // Dataset interfaces (NOTE-03: User can upload datasets)
    export interface Dataset {
      id: number;
      filename: string;
      original_filename: string;
      file_size_bytes: number;
      content_type: string;
      row_count: number | null;
      created_at: string;
      download_url: string | null;
    }

    export interface DatasetListResponse {
      datasets: Dataset[];
      total: number;
    }

    // Compilation interfaces (NOTE-04: User can compile notebooks)
    export interface CompilationRequest {
      notebook_id: number;
      dataset_id?: number;
    }

    export interface AsyncCompilationResponse {
      task_id: string;
      notebook_id: number;
      status: 'pending' | 'processing' | 'success' | 'failed';
    }

    export interface CompilationStatusResponse {
      task_id: string;
      state: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY';
      result?: CompilationResult;
      error?: string;
    }

    export interface CompilationResult {
      status: 'success' | 'failed';
      notebook_id: number;
      output_url?: string;
      output_key?: string;
      error?: string;
    }

    // Publish interfaces (NOTE-05: User can publish notebooks)
    export interface PublishRequest {
      notebook_id: number;
      output_key: string;
      auto_invalidate?: boolean;
    }

    export interface PublishResponse {
      notebook_id: number;
      is_published: boolean;
      output_url: string;
      invalidation_id?: string;
    }
    ```

    Then add methods to the apiClient object (after existing methods):
    ```typescript
    // Dataset methods (NOTE-03: User can upload datasets)
    async uploadDataset(file: File): Promise<Dataset> {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.fetchWithErrorHandling(`${this.apiUrl}/datasets`, {
        method: 'POST',
        body: formData,
      });
      return response;
    }

    async getDatasets(): Promise<DatasetListResponse> {
      const response = await this.fetchWithErrorHandling(`${this.apiUrl}/datasets`);
      return response;
    }

    async getDataset(id: number): Promise<Dataset> {
      const response = await this.fetchWithErrorHandling(`${this.apiUrl}/datasets/${id}`);
      return response;
    }

    async deleteDataset(id: number): Promise<void> {
      await this.fetchWithErrorHandling(`${this.apiUrl}/datasets/${id}`, {
        method: 'DELETE',
      });
    }

    // Compilation methods (NOTE-04: User can compile notebooks)
    async compileNotebookAsync(request: CompilationRequest): Promise<AsyncCompilationResponse> {
      const response = await this.fetchWithErrorHandling(`${this.apiUrl}/compilation/compile/async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return response;
    }

    async getCompilationStatus(taskId: string): Promise<CompilationStatusResponse> {
      const response = await this.fetchWithErrorHandling(`${this.apiUrl}/compilation/status/${taskId}`);
      return response;
    }

    // Publish methods (NOTE-05: User can publish notebooks)
    async publishNotebook(request: PublishRequest): Promise<PublishResponse> {
      const response = await this.fetchWithErrorHandling(`${this.apiUrl}/compilation/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return response;
    }

    async compileAndPublish(notebookId: number, datasetId?: number): Promise<AsyncCompilationResponse> {
      return this.compileNotebookAsync({ notebook_id: notebookId, dataset_id });
    }
    ```
  </action>
  <verify>
    <automated>grep -q "uploadDataset" frontend/lib/api-client.ts && grep -q "compileNotebookAsync" frontend/lib/api-client.ts && grep -q "publishNotebook" frontend/lib/api-client.ts && echo "API client extended with compilation methods"</automated>
  </verify>
  <done>
    - Dataset interfaces added (Dataset, DatasetListResponse)
    - Compilation interfaces added (CompilationRequest, AsyncCompilationResponse, CompilationStatusResponse, CompilationResult)
    - Publish interfaces added (PublishRequest, PublishResponse)
    - uploadDataset method for CSV file upload (NOTE-03)
    - getDatasets, getDataset, deleteDataset methods for dataset management
    - compileNotebookAsync for async compilation submission (NOTE-04)
    - getCompilationStatus for polling task status
    - publishNotebook for publishing compiled notebooks (NOTE-05)
    - compileAndPublish convenience method
  </done>
</task>

<task type="auto">
  <name>Task 2: Create compilation store for state management</name>
  <files>
    frontend/stores/compilation-store.ts
  </files>
  <read_first>
    - frontend/stores/notebook-store.ts (for store pattern reference)
    - frontend/lib/api-client.ts (for API client methods)
  </read_first>
  <action>
    Create frontend/stores/compilation-store.ts:
    ```typescript
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
    ```
  </action>
  <verify>
    <automated>grep -q "useCompilationStore" frontend/stores/compilation-store.ts && grep -q "compileNotebook:" frontend/stores/compilation-store.ts && echo "Compilation store created"</automated>
  </verify>
  <done>
    - CompilationState interface defined with all required fields
    - useCompilationStore created with Zustand
    - compileNotebook action submits task and starts polling
    - pollCompilationStatus polls every 5 seconds for up to 5 minutes (60 attempts * 5 seconds = 300 seconds)
    - resetCompilation clears compilation state
    - loadDatasets fetches user's datasets
    - setSelectedDataset updates selected dataset
    - deleteDataset deletes dataset and reloads list
    - uploadDataset uploads file and reloads list
    - publishNotebook publishes compiled notebook
    - setOutputPreview sets output URL and key for preview
  </done>
</task>

</tasks>

<verification>
- API client extended with compilation and dataset methods
    - Compilation store manages compilation state
    - Polling for compilation status (5-second intervals, 5-minute timeout)
    - Dataset management actions (load, upload, delete)
    - Publish action for notebook publication
</verification>

<success_criteria>
- API client has all compilation/dataset methods
    - Compilation store initializes without errors
    - compileNotebook submits task and starts polling
    - pollCompilationStatus respects 5-second interval and 5-minute timeout
    - loadDatasets fetches from /datasets endpoint
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-05A-SUMMARY.md`
</output>
