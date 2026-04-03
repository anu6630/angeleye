'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadPyodideInstance } from '@/lib/pyodide-loader';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';
import { useNotebookStore } from '@/stores';

export default function EditNotebookPage() {
  const router = useRouter();
  const params = useParams();
  const notebookId = parseInt(params.id as string, 10);
  const [isLoading, setIsLoading] = useState(true);

  const { notebookId: currentId, loadNotebook, reset } = useNotebookStore();

  useEffect(() => {
    // Pre-load Pyodide in background
    loadPyodideInstance().then(() => {
      setIsLoading(false);
    });

    // Load notebook data
    if (!isNaN(notebookId)) {
      loadNotebook(notebookId).catch((error) => {
        console.error('Failed to load notebook:', error);
        router.push('/notebooks');
      });
    }

    return () => reset();
  }, [notebookId, loadNotebook, reset, router]);

  if (isLoading || currentId !== notebookId) {
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
        <Link href="/my-notebooks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Notebooks
          </Button>
        </Link>
      </div>
      <NotebookEditor notebookId={notebookId} />
    </div>
  );
}
