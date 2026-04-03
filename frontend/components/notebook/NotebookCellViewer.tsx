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

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Cell header */}
      <div className="px-4 py-2 border-b bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {cell_type}
        </span>
      </div>

      {/* Cell content - read-only display */}
      <div className="p-4">
        {cell_type === 'code' ? (
          <pre className="bg-muted rounded p-4 overflow-x-auto text-sm">
            <code>{content}</code>
          </pre>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Cell output - pre-rendered (VIEW-05: no execution) */}
      <NotebookOutput output={output} isRunning={false} />
    </div>
  );
}
