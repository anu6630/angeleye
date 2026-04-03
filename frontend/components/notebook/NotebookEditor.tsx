'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, FileText, Eye, Loader2, Upload, Send } from 'lucide-react';
import { useNotebookStore } from '@/stores/notebook-store';
import { useCompilationStore } from '@/stores/compilation-store';
import { NotebookCell } from './NotebookCell';
import { CompilationDialog } from './CompilationDialog';
import { PublishDialog } from './PublishDialog';

interface NotebookEditorProps {
  notebookId?: number;
}

export function NotebookEditor({ notebookId }: NotebookEditorProps) {
  const {
    cells,
    title,
    isSaving,
    isPublished,
    setTitle,
    addCell,
    deleteCell,
    executeCell,
    reset,
    saveNotebook,
    publishNotebook,
    loadNotebook,
  } = useNotebookStore();

  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const [showCompileDialog, setShowCompileDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const { compilationStatus } = useCompilationStore();

  useEffect(() => {
    if (notebookId) {
      loadNotebook(notebookId);
    }
    return () => reset();
  }, [notebookId, loadNotebook, reset]);

  const handleSave = async () => {
    try {
      await saveNotebook();
    } catch (error) {
      console.error('Failed to save notebook:', error);
    }
  };

  const handlePublish = async () => {
    try {
      await publishNotebook();
    } catch (error) {
      console.error('Failed to publish notebook:', error);
    }
  };

  const handleRunCell = async (id: string) => {
    // Load pyodide if not already loaded
    if (!isPyodideLoading) {
      setIsPyodideLoading(true);
      try {
        const { loadPyodideInstance } = await import('@/lib/pyodide-loader');
        const pyodide = await loadPyodideInstance();
        await executeCell(id, pyodide);
      } catch (error) {
        console.error('Failed to execute cell:', error);
      } finally {
        setIsPyodideLoading(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notebook title"
          className="text-xl font-semibold border-0 px-0 focus-visible:ring-0"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-6">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
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
      </div>

      {/* Cells */}
      <div className="space-y-4">
        {cells.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No cells yet</p>
            <Button onClick={() => addCell('code')}>
              Add Code Cell
            </Button>
          </div>
        ) : (
          cells.map((cell: any, index: number) => (
            <NotebookCell
              key={cell.id}
              id={cell.id}
              cell_type={cell.cell_type}
              content={cell.content}
              output={cell.output}
              error={cell.error}
              isRunning={cell.isRunning}
              onRun={() => handleRunCell(cell.id)}
              onDelete={() => deleteCell(cell.id)}
              onAddCell={() => addCell('code')}
            />
          ))
        )}
      </div>

      {/* Add cell buttons */}
      {cells.length > 0 && (
        <div className="flex gap-2 mt-4">
          <Button onClick={() => addCell('code')} variant="outline">
            + Code Cell
          </Button>
          <Button onClick={() => addCell('markdown')} variant="outline">
            + Markdown Cell
          </Button>
        </div>
      )}
    </div>

    {/* Dialogs */}
    <CompilationDialog
      open={showCompileDialog}
      onOpenChange={setShowCompileDialog}
      notebookId={notebookId || null}
    />

    <PublishDialog
      open={showPublishDialog}
      onOpenChange={setShowPublishDialog}
      notebookId={notebookId || null}
    />
  );
}
