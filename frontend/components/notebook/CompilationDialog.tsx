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
