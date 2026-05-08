'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { loadPyodideInstance } from '@/lib/pyodide-loader';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { useNotebookStore } from '@/stores/notebook-store';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NewNotebookPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { reset } = useNotebookStore();

  useEffect(() => {
    // Pre-load Pyodide in background for faster initial run (PERF-03)
    loadPyodideInstance()
      .then(() => {
        console.log('Pyodide pre-loaded for new notebook');
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Pyodide:', err);
        setError(err.message || 'Failed to load Python runtime');
        setIsLoading(false);
      });

    // Reset editor state for new notebook
    reset();

    return () => {
      // Cleanup on unmount
    };
  }, [reset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Failed to load editor</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs opacity-70">
                  The Python runtime (Pyodide) could not be loaded. This may be due to network issues or browser restrictions.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NotebookEditor />
    </div>
  );
}
