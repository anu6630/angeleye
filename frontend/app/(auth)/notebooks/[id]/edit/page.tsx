'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadPyodideInstance } from '@/lib/pyodide-loader';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { useNotebookStore } from '@/stores/notebook-store';
import { useCompilationStore } from '@/stores/compilation-store';

export default function EditNotebookPage() {
  const router = useRouter();
  const params = useParams();
  const notebookId = parseInt(params.id as string, 10);
  const [isLoading, setIsLoading] = useState(true);
  const [notebookExists, setNotebookExists] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const { loadNotebook, reset } = useNotebookStore();
  const compilationState = useCompilationStore();

  useEffect(() => {
    async function init() {
      console.log('📝 Loading notebook:', notebookId);
      try {
        // Load notebook data
        await loadNotebook(notebookId);
        console.log('✅ Notebook loaded successfully');
        setNotebookExists(true);

        // Set loading to false - notebook data is loaded, Pyodide loads in background
        setIsLoading(false);
        console.log('✅ Loading state set to false');

        // Pre-load Pyodide in background (non-blocking)
        loadPyodideInstance().catch((error) => {
          console.error('Failed to load Pyodide:', error);
        });
      } catch (error) {
        console.error('❌ Failed to load notebook:', error);
        setNotebookExists(false);
        setIsLoading(false);
        router.push('/my-notebooks');
      }
    }

    if (!isNaN(notebookId)) {
      init();
    }

    return () => {
      // Don't call reset() - it clears the notebookId and causes oscillation
      // The store state will be updated when loading the next notebook
    };
  }, [notebookId, loadNotebook, reset, router]);

  // Debug logging
  useEffect(() => {
    console.log('🔄 State update:', {
      isLoading,
      notebookExists,
      targetNotebookId: notebookId,
      shouldShowLoading: isLoading
    });
  }, [isLoading, notebookExists, notebookId]);

  // Log compilation state for debugging
  useEffect(() => {
    console.log('💾 Compilation state:', {
      compilationStatus: compilationState.compilationStatus,
      currentNotebookId: compilationState.currentNotebookId,
      outputKey: compilationState.outputKey,
      outputUrl: compilationState.outputUrl,
      notebookId,
      canPublish: compilationState.compilationStatus === 'success' &&
                 compilationState.outputKey &&
                 compilationState.currentNotebookId === notebookId
    });
  }, [compilationState, notebookId]);

  if (!notebookExists) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Notebook not found</p>
          <Link href="/my-notebooks" className="text-blue-500 hover:underline">
            Back to My Notebooks
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading notebook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back button */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/my-notebooks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Notebooks
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? 'Hide' : 'Show'} Debug
          </Button>
        </div>
      </div>

      {/* Debug panel */}
      {showDebug && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-semibold mb-2">Compilation State Debug</h3>
            <div className="space-y-1 text-sm font-mono">
              <div>notebookId: {notebookId}</div>
              <div>compilationStatus: {compilationState.compilationStatus}</div>
              <div>currentNotebookId: {compilationState.currentNotebookId}</div>
              <div>outputKey: {compilationState.outputKey || 'null'}</div>
              <div>outputUrl: {compilationState.outputUrl || 'null'}</div>
              <div className="font-bold">
                canPublish: {String(
                  compilationState.compilationStatus === 'success' &&
                  compilationState.outputKey &&
                  compilationState.currentNotebookId === notebookId
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <NotebookEditor notebookId={notebookId} />
    </div>
  );
}
