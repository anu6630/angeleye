'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadPyodideInstance } from '@/lib/pyodide-loader';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { useNotebookStore } from '@/stores';

export default function NewNotebookPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { reset } = useNotebookStore();

  useEffect(() => {
    // Pre-load Pyodide in background for faster initial run (PERF-03)
    loadPyodideInstance().then(() => {
      console.log('Pyodide pre-loaded for new notebook');
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

  return (
    <div className="min-h-screen bg-background">
      <NotebookEditor />
    </div>
  );
}
