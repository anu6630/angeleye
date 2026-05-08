---
phase: 03-execution-publishing
plan: 05B
type: execute
wave: 5
depends_on: ["03-05A"]
files_modified:
  - frontend/components/notebook/CompilationDialog.tsx
  - frontend/components/notebook/PublishDialog.tsx
  - frontend/components/notebook/NotebookEditor.tsx
  - frontend/app/datasets/page.tsx
autonomous: true
requirements:
  - NOTE-03
  - NOTE-04
  - NOTE-05
  - PERF-02
  - PERF-04

must_haves:
  truths:
    - "CompilationDialog shows dataset selection and compilation status"
    - "PublishDialog shows output preview and publish confirmation"
    - "Datasets page at /datasets route for CSV upload"
    - "Compile and Publish buttons added to NotebookEditor"
    - "All components use shadcn/ui Dialog and Button components"
  artifacts:
    - path: "frontend/components/notebook/CompilationDialog.tsx"
      provides: "Compilation dialog component with dataset selection"
      exports: ["CompilationDialog"]
      min_lines: 150
    - path: "frontend/components/notebook/PublishDialog.tsx"
      provides: "Publish dialog with output preview"
      exports: ["PublishDialog"]
      min_lines: 100
    - path: "frontend/app/datasets/page.tsx"
      provides: "Datasets management page"
      exports: ["default"]
      min_lines: 150
  key_links:
    - from: "frontend/components/notebook/CompilationDialog.tsx"
      to: "frontend/stores/compilation-store.ts"
      via: "useCompilationStore for state management"
      pattern: "useCompilationStore"
    - from: "frontend/components/notebook/PublishDialog.tsx"
      to: "frontend/stores/compilation-store.ts"
      via: "useCompilationStore for output preview"
      pattern: "useCompilationStore"

---

# Phase 03-05B: Compilation and Publishing UI Components

<objective>
Create CompilationDialog and PublishDialog components with the datasets management page. Integrate dialogs into NotebookEditor with Compile and Publish buttons.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@frontend/stores/compilation-store.ts (for compilation store)
@frontend/components/ui/dialog.tsx (for Dialog component)
@frontend/components/ui/button.tsx (for Button component)
@frontend/components/notebook/NotebookEditor.tsx (to add buttons)

## UI Patterns from Phase 2

- shadcn/ui components (Dialog, Button, Progress)
- Zustand for state management
- Lucide React icons
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CompilationDialog component</name>
  <files>
    frontend/components/notebook/CompilationDialog.tsx
  </files>
  <read_first>
    - frontend/stores/compilation-store.ts (for compilation store)
    - frontend/components/ui/dialog.tsx (for Dialog component)
    - frontend/components/ui/button.tsx (for Button component)
  </read_first>
  <action>
    Create frontend/components/notebook/CompilationDialog.tsx:
    ```typescript
    'use client';

    import { useEffect, useState } from 'react';
    import {
      Dialog,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
    } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { useCompilationStore } from '@/stores/compilation-store';
    import type { Dataset } from '@/lib/api-client';
    import {
      Loader2,
      Upload,
      FileSpreadsheet,
      CheckCircle2,
      XCircle,
      AlertCircle
    } from 'lucide-react';

    interface CompilationDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      notebookId: number | null;
    }

    export function CompilationDialog({ open, onOpenChange, notebookId }: CompilationDialogProps) {
      const {
        isCompiling,
        compilationStatus,
        compilationResult,
        datasets,
        selectedDatasetId,
        isLoadingDatasets,
        compileNotebook,
        loadDatasets,
        setSelectedDataset,
        resetCompilation,
      } = useCompilationStore();

      const [localSelectedDataset, setLocalSelectedDataset] = useState<number | null>(null);

      useEffect(() => {
        if (open) {
          loadDatasets();
        }
      }, [open, loadDatasets]);

      useEffect(() => {
        setLocalSelectedDataset(selectedDatasetId);
      }, [selectedDatasetId]);

      const handleCompile = async () => {
        if (!notebookId) return;

        await compileNotebook(notebookId, localSelectedDataset || undefined);
      };

      const handleClose = () => {
        onOpenChange(false);
        // Don't reset state on close to allow viewing result
      };

      const handleReset = () => {
        resetCompilation();
      };

      const getStatusMessage = () => {
        switch (compilationStatus) {
          case 'pending':
            return 'Submitting compilation task...';
          case 'processing':
            return 'Compiling notebook in isolated container...';
          case 'success':
            return 'Compilation completed successfully!';
          case 'failed':
            return `Compilation failed: ${compilationResult?.error || 'Unknown error'}`;
          default:
            return 'Prepare to compile your notebook.';
        }
      };

      const getStatusIcon = () => {
        switch (compilationStatus) {
          case 'processing':
          case 'pending':
            return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
          case 'success':
            return <CheckCircle2 className="h-5 w-5 text-green-500" />;
          case 'failed':
            return <XCircle className="h-5 w-5 text-red-500" />;
          default:
            return <AlertCircle className="h-5 w-5 text-gray-500" />;
        }
      };

      return (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Compile Notebook</DialogTitle>
              <DialogDescription>
                Compile your notebook in an isolated container. Choose an optional dataset to use.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Status */}
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/50">
                {getStatusIcon()}
                <div className="flex-1">
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
                </div>
                {compilationStatus === 'failed' && (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                )}
              </div>

              {/* Dataset Selection */}
              {compilationStatus === 'idle' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Optional Dataset</label>
                  {isLoadingDatasets ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading datasets...
                    </div>
                  ) : datasets.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No datasets uploaded yet.{' '}
                      <a href="/datasets" className="text-primary hover:underline">
                        Upload a dataset
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="no-dataset"
                          name="dataset"
                          checked={localSelectedDataset === null}
                          onChange={() => setLocalSelectedDataset(null)}
                          className="h-4 w-4"
                        />
                        <label htmlFor="no-dataset" className="text-sm cursor-pointer">
                          No dataset
                        </label>
                      </div>
                      {datasets.map((dataset) => (
                        <div key={dataset.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            id={`dataset-${dataset.id}`}
                            name="dataset"
                            checked={localSelectedDataset === dataset.id}
                            onChange={() => setLocalSelectedDataset(dataset.id)}
                            className="h-4 w-4"
                          />
                          <label
                            htmlFor={`dataset-${dataset.id}`}
                            className="text-sm cursor-pointer flex items-center gap-2 flex-1"
                          >
                            <FileSpreadsheet className="h-4 w-4 text-green-500" />
                            <span>{dataset.original_filename}</span>
                            <span className="text-xs text-muted-foreground">
                              ({dataset.row_count} rows)
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Success Actions */}
              {compilationStatus === 'success' && compilationResult?.result && (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">
                    Your notebook has been compiled successfully!
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(compilationResult.result!.output_url, '_blank')}
                  >
                    Preview Output
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isCompiling}>
                {compilationStatus === 'success' ? 'Close' : 'Cancel'}
              </Button>
              {compilationStatus === 'idle' && (
                <Button onClick={handleCompile} disabled={!notebookId || isCompiling}>
                  {isCompiling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Compiling...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Compile
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    ```
  </action>
  <verify>
    <automated>grep -q "CompilationDialog" frontend/components/notebook/CompilationDialog.tsx && grep -q "export function CompilationDialog" frontend/components/notebook/CompilationDialog.tsx && echo "CompilationDialog component created"</automated>
  </verify>
  <done>
    - CompilationDialog component created with Dialog UI
    - Dataset selection with radio buttons (syncs with store)
    - Status indicator with icons for each state
    - Compile button that triggers compilation
    - Preview output button on success (opens in new tab)
    - Loading states for datasets and compilation
    - Error display with reset option
    - Link to /datasets when no datasets available
  </done>
</task>

<task type="auto">
  <name>Task 2: Create PublishDialog component and integrate dialogs into NotebookEditor</name>
  <files>
    frontend/components/notebook/PublishDialog.tsx
    frontend/components/notebook/NotebookEditor.tsx
  </files>
  <read_first>
    - frontend/components/notebook/CompilationDialog.tsx (for status handling)
    - frontend/stores/notebook-store.ts (for notebook store)
    - frontend/components/notebook/NotebookEditor.tsx (to add compile/publish buttons)
  </read_first>
  <action>
    Create frontend/components/notebook/PublishDialog.tsx:
    ```typescript
    'use client';

    import { useState } from 'react';
    import {
      Dialog,
      DialogContent,
      DialogDescription,
      DialogFooter,
      DialogHeader,
      DialogTitle,
    } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { useCompilationStore } from '@/stores/compilation-store';
    import { Send } from 'lucide-react';

    interface PublishDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      notebookId: number | null;
    }

    export function PublishDialog({ open, onOpenChange, notebookId }: PublishDialogProps) {
      const { outputUrl, outputKey, publishNotebook, compilationStatus } = useCompilationStore();
      const [isPublishing, setIsPublishing] = useState(false);
      const [published, setPublished] = useState(false);

      const handlePublish = async () => {
        if (!notebookId || !outputKey) return;

        setIsPublishing(true);
        try {
          await publishNotebook(notebookId, outputKey);
          setPublished(true);
        } catch (error) {
          console.error('Failed to publish:', error);
        } finally {
          setIsPublishing(false);
        }
      };

      const handleClose = () => {
        onOpenChange(false);
        setPublished(false);
      };

      const canPublish = compilationStatus === 'success' && outputKey;

      return (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Publish to Feed</DialogTitle>
              <DialogDescription>
                Publish your compiled notebook to the social feed for others to view.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {!canPublish ? (
                <div className="p-4 rounded-lg border bg-yellow-50 text-yellow-800">
                  <p className="text-sm">
                    Your notebook must be compiled successfully before you can publish it.
                  </p>
                </div>
              ) : !published ? (
                <div className="space-y-3">
                  <p className="text-sm">
                    Your notebook is ready to publish. Once published, it will appear in the social
                    feed and other users will be able to view the compiled output.
                  </p>
                  <div className="p-3 rounded-lg border bg-muted">
                    <p className="text-xs text-muted-foreground">Output URL</p>
                    <p className="text-sm font-mono truncate">{outputUrl}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border bg-green-50 text-green-800">
                  <p className="text-sm font-medium">
                    Your notebook has been published to the social feed!
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
                {published ? 'Close' : 'Cancel'}
              </Button>
              {canPublish && !published && (
                <Button onClick={handlePublish} disabled={isPublishing}>
                  {isPublishing ? (
                    'Publishing...'
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Publish to Feed
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
    ```

    Update frontend/components/notebook/NotebookEditor.tsx to add Compile and Publish buttons:

    Add imports at the top:
    ```typescript
    import { CompilationDialog } from './CompilationDialog';
    import { PublishDialog } from './PublishDialog';
    import { useCompilationStore } from '@/stores/compilation-store';
    import { Upload, Send } from 'lucide-react';
    import { useState } from 'react';
    ```

    In the component, add state for dialogs:
    ```typescript
    const [showCompileDialog, setShowCompileDialog] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const { notebookId } = useNotebookStore();
    const { compilationStatus, resetCompilation } = useCompilationStore();
    ```

    Add Compile and Publish buttons in the toolbar/button area:
    ```typescript
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowCompileDialog(true)}
    >
      <Upload className="h-4 w-4 mr-2" />
      Compile
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowPublishDialog(true)}
      disabled={compilationStatus !== 'success'}
    >
      <Send className="h-4 w-4 mr-2" />
      Publish
    </Button>
    ```

    Add dialogs at the end of the component JSX (before closing fragment/div):
    ```typescript
    <CompilationDialog
      open={showCompileDialog}
      onOpenChange={setShowCompileDialog}
      notebookId={notebookId}
    />

    <PublishDialog
      open={showPublishDialog}
      onOpenChange={setShowPublishDialog}
      notebookId={notebookId}
    />
    ```
  </action>
  <verify>
    <automated>grep -q "PublishDialog" frontend/components/notebook/PublishDialog.tsx && grep -q "export function PublishDialog" frontend/components/notebook/PublishDialog.tsx && grep -q "CompilationDialog" frontend/components/notebook/NotebookEditor.tsx && echo "PublishDialog created and dialogs integrated"</automated>
  </verify>
  <done>
    - PublishDialog component created
    - Shows warning if notebook not compiled
    - Shows output URL when ready to publish
    - Shows success message after publishing
    - CompilationDialog and PublishDialog integrated into NotebookEditor
    - Compile button opens compilation dialog
    - Publish button opens publish dialog (disabled if not compiled)
  </done>
</task>

<task type="auto">
  <name>Task 3: Create datasets page for dataset management</name>
  <files>
    frontend/app/datasets/page.tsx
  </files>
  <read_first>
    - frontend/app/notebooks/page.tsx (for page structure reference)
    - frontend/stores/compilation-store.ts (for dataset loading)
  </read_first>
  <action>
    Create frontend/app/datasets/page.tsx:
    ```typescript
    'use client';

    import { useEffect, useState, useRef } from 'react';
    import { useAuthStore } from '@/stores/auth-store';
    import { useCompilationStore } from '@/stores/compilation-store';
    import type { Dataset } from '@/lib/api-client';
    import {
      Button,
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
    } from '@/components/ui';
    import { Upload, Trash2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';

    export default function DatasetsPage() {
      const { isAuthenticated } = useAuthStore();
      const {
        datasets,
        isLoadingDatasets,
        loadDatasets,
        deleteDataset,
        uploadDataset,
      } = useCompilationStore();

      const [uploading, setUploading] = useState(false);
      const [deleting, setDeleting] = useState<number | null>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        if (isAuthenticated) {
          loadDatasets();
        }
      }, [isAuthenticated, loadDatasets]);

      const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv')) {
          alert('Only CSV files are allowed');
          return;
        }

        // Validate file size (100MB limit)
        if (file.size > 100 * 1024 * 1024) {
          alert('File size exceeds 100MB limit');
          return;
        }

        setUploading(true);
        try {
          await uploadDataset(file);
        } catch (error) {
          console.error('Failed to upload dataset:', error);
          alert('Failed to upload dataset');
        } finally {
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };

      const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this dataset?')) return;

        setDeleting(id);
        try {
          await deleteDataset(id);
        } catch (error) {
          console.error('Failed to delete dataset:', error);
          alert('Failed to delete dataset');
        } finally {
          setDeleting(null);
        }
      };

      const handleDownload = async (dataset: Dataset) => {
        if (dataset.download_url) {
          window.open(dataset.download_url, '_blank');
        }
      };

      const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      if (!isAuthenticated) {
        return (
          <div className="container mx-auto py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Authentication Required</h1>
              <p className="text-muted-foreground mt-2">
                Please sign in to manage your datasets.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="container mx-auto py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">My Datasets</h1>
              <p className="text-muted-foreground">
                Upload CSV files to use in your notebooks
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Dataset
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {isLoadingDatasets ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : datasets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload your first CSV dataset to get started
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Dataset
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {datasets.map((dataset) => (
                <Card key={dataset.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-green-500" />
                        <div>
                          <CardTitle className="text-base">
                            {dataset.original_filename}
                          </CardTitle>
                          <CardDescription>
                            {dataset.row_count} rows {formatFileSize(dataset.file_size_bytes)}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(dataset)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(dataset.id)}
                          disabled={deleting === dataset.id}
                        >
                          {deleting === dataset.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }
    ```
  </action>
  <verify>
    <automated>grep -q "DatasetsPage" frontend/app/datasets/page.tsx && grep -q "export default function DatasetsPage" frontend/app/datasets/page.tsx && echo "Datasets page created"</automated>
  </verify>
  <done>
    - Datasets page created at /datasets route
    - Upload button with file input for CSV files
    - File type validation (CSV only)
    - File size validation (100MB limit)
    - Dataset cards with filename, row count, file size
    - Download button for each dataset
    - Delete button with confirmation
    - Empty state with upload prompt
    - Authentication check
  </done>
</task>

</tasks>

<verification>
- CompilationDialog component created with dataset selection
    - PublishDialog component created with output preview
    - Dialogs integrated into NotebookEditor
    - Datasets page created at /datasets
    - File upload with validation (CSV, 100MB)
    - Dataset list with download and delete actions
    - Polling for compilation status (5-second intervals, 5-minute timeout)
</verification>

<success_criteria>
- User can upload CSV datasets from /datasets page
    - User can select dataset and compile notebook
    - Compilation status shows in dialog with progress
    - User can preview output after successful compilation
    - User can publish notebook to feed
    - Published notebooks appear in social feed
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-05B-SUMMARY.md`
</output>
