'use client';

import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NotebookOutputProps {
  output?: string;
  error?: string;
  isRunning: boolean;
}

export function NotebookOutput({ output, error, isRunning }: NotebookOutputProps) {
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Executing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
        <p className="text-sm text-destructive font-mono">{error}</p>
      </div>
    );
  }

  if (output) {
    return (
      <div className="px-4 py-2 bg-muted/30 border-t max-h-60 overflow-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className="text-sm font-mono whitespace-pre-wrap"
        >
          {output}
        </ReactMarkdown>
      </div>
    );
  }

  return null;
}
