'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Play, Trash2, Plus } from 'lucide-react';
import { useNotebookStore } from '@/stores';
import { NotebookOutput } from './NotebookOutput';

interface NotebookCellProps {
  id: string;
  cell_type: 'code' | 'markdown';
  content: string;
  output?: string;
  error?: string;
  isRunning: boolean;
  onRun: () => void;
  onDelete: () => void;
  onAddCell: () => void;
}

export function NotebookCell({
  id,
  cell_type,
  content,
  output,
  error,
  isRunning,
  onRun,
  onDelete,
  onAddCell,
}: NotebookCellProps) {
  const { updateCellCode } = useNotebookStore();
  const [pyodide, setPyodide] = useState<any>(null);

  useEffect(() => {
    // Load pyodide on mount for code cells
    if (cell_type === 'code' && !pyodide) {
      import('@/lib/pyodide-loader').then(({ loadPyodideInstance }) => {
        loadPyodideInstance().then(setPyodide);
      });
    }
  }, [cell_type, pyodide]);

  const handleRun = () => {
    if (pyodide) {
      onRun();
    }
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Cell header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {cell_type}
        </span>
        <div className="flex items-center gap-2">
          {cell_type === 'code' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRun}
                disabled={isRunning || !pyodide}
              >
                <Play className="h-4 w-4" />
                {isRunning ? 'Running...' : 'Run'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onAddCell}
              >
                <Plus className="h-4 w-4" />
                Add Cell
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cell content */}
      {cell_type === 'code' ? (
        <div className="min-h-[120px]">
          <Editor
            height="120px"
            language="python"
            value={content}
            onChange={(value) => updateCellCode(id, value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              padding: { top: 8, bottom: 8 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => updateCellCode(id, e.target.value)}
          placeholder="Write Markdown..."
          className="w-full min-h-[80px] p-4 bg-background resize-none focus:outline-none"
        />
      )}

      {/* Cell output */}
      <NotebookOutput output={output} error={error} isRunning={isRunning} />
    </div>
  );
}
