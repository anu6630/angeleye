'use client';

import { useState, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Play, Trash2, Code2, Type } from 'lucide-react';
import { useNotebookStore } from '@/stores/notebook-store';
import { NotebookOutput } from './NotebookOutput';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NotebookCellProps {
  id: string;
  cell_type: 'code' | 'markdown';
  content: string;
  output?: string;
  error?: string;
  isRunning: boolean;
  onRun: () => void;
  onDelete: () => void;
  onAddCell: (type?: 'code' | 'markdown') => void;
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
  const { updateCellCode, updateCellType } = useNotebookStore();
  // Markdown cells start in edit mode when empty, preview when they have content
  const [isEditingMarkdown, setIsEditingMarkdown] = useState(!content.trim());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (cell_type === 'markdown' && isEditingMarkdown) {
      textareaRef.current?.focus();
    }
  }, [isEditingMarkdown, cell_type]);

  const handleToggleType = () => {
    const next = cell_type === 'code' ? 'markdown' : 'code';
    updateCellType(id, next);
    if (next === 'markdown') setIsEditingMarkdown(true);
  };

  const isCode = cell_type === 'code';
  const isEmpty = !content.trim();

  return (
    <div className="group relative rounded-xl border border-border/60 bg-card overflow-visible transition-shadow hover:shadow-sm">
      {/* Toolbar — subtle, appears on hover */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/30 opacity-50 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleToggleType}
          title={isCode ? 'Switch to text cell' : 'Switch to code cell'}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCode
            ? <><Code2 className="h-3.5 w-3.5" /><span>Code</span></>
            : <><Type className="h-3.5 w-3.5" /><span>Text</span></>
          }
        </button>

        <div className="flex items-center gap-1">
          {isCode && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onRun} disabled={isRunning}>
              <Play className="h-3 w-3 mr-1" />
              {isRunning ? 'Running…' : 'Run'}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Cell body */}
      {isCode ? (
        <div className="min-h-[80px]">
          <Editor
            height="auto"
            defaultLanguage="python"
            value={content}
            onChange={(v) => updateCellCode(id, v || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              padding: { top: 8, bottom: 8 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
            onMount={(editor) => {
              const resize = () => {
                const lines = editor.getModel()?.getLineCount() || 1;
                const h = Math.max(80, lines * 20 + 24);
                editor.getContainerDomNode().style.height = `${h}px`;
                editor.layout();
              };
              editor.onDidChangeModelContent(resize);
              resize();
            }}
          />
        </div>
      ) : (
        /* Notion-style markdown: click anywhere to edit, blur to preview */
        isEditingMarkdown ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => updateCellCode(id, e.target.value)}
            onBlur={() => { if (content.trim()) setIsEditingMarkdown(false); }}
            placeholder="Write text, headings (#), lists (-)… Markdown supported"
            rows={Math.max(3, (content.match(/\n/g) || []).length + 2)}
            className="w-full p-4 bg-background resize-none focus:outline-none text-sm leading-relaxed border-0"
          />
        ) : (
          <div
            className="px-5 py-4 cursor-text min-h-[48px]"
            onClick={() => setIsEditingMarkdown(true)}
            title="Click to edit"
          >
            {isEmpty
              ? <p className="text-muted-foreground text-sm italic">Click to add text…</p>
              : <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
            }
          </div>
        )
      )}

      {/* Output — code cells only */}
      {isCode && <NotebookOutput output={output} error={error} isRunning={isRunning} />}

      {/* Add-cell strip — appears at the bottom edge on hover */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 hidden group-hover:flex items-center gap-0 bg-background border border-border rounded-full shadow-sm overflow-hidden">
        <button
          onClick={() => onAddCell('code')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1 transition-colors"
        >
          <Code2 className="h-3 w-3" /> Code
        </button>
        <span className="w-px h-4 bg-border" />
        <button
          onClick={() => onAddCell('markdown')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1 transition-colors"
        >
          <Type className="h-3 w-3" /> Text
        </button>
      </div>
    </div>
  );
}
