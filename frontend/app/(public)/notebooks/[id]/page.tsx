'use client';

import { useParams } from 'next/navigation';
import { NotebookViewer } from '@/components/notebook/NotebookViewer';

export default function NotebookPage() {
  const params = useParams();
  const notebookId = parseInt(params.id as string, 10);

  if (isNaN(notebookId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Invalid notebook ID</p>
      </div>
    );
  }

  return <NotebookViewer notebookId={notebookId} />;
}
