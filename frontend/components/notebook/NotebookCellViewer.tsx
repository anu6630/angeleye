'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NotebookOutput } from './NotebookOutput';

interface NotebookCellViewerProps {
  cell: {
    id?: number;
    cell_type: 'code' | 'markdown';
    content: string;
    order_index: number;
    output?: string;
  };
}

export function NotebookCellViewer({ cell }: NotebookCellViewerProps) {
  const { cell_type, content, output } = cell;

  // Code cells: show output only — source is never shown to viewers.
  // If a code cell produced no output, render nothing (no empty box).
  if (cell_type === 'code') {
    if (!output) return null;
    return (
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <NotebookOutput output={output} isRunning={false} />
      </div>
    );
  }

  // Markdown cells: render as formatted text.
  if (!content.trim()) return null;
  return (
    <div className="px-5 py-4 prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
