'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCompilationStore } from '@/stores/compilation-store';
import { Send } from 'lucide-react';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: number | null;
}

export function PublishDialog({ open, onOpenChange, notebookId }: PublishDialogProps) {
  const { outputUrl, outputKey, publishNotebook, compilationStatus } = useCompilationStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handlePublish = async () => {
    if (!notebookId || !outputKey) return;

    setIsPublishing(true);
    try {
      await publishNotebook(notebookId, outputKey);
      setPublished(true);
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPublished(false);
  };

  const canPublish = compilationStatus === 'success' && outputKey;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish to Feed</DialogTitle>
          <DialogDescription>
            Publish your compiled notebook to the social feed for others to view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!canPublish ? (
            <div className="p-4 rounded-lg border bg-yellow-50 text-yellow-800">
              <p className="text-sm">
                Your notebook must be compiled successfully before you can publish it.
              </p>
            </div>
          ) : !published ? (
            <div className="space-y-3">
              <p className="text-sm">
                Your notebook is ready to publish. Once published, it will appear in the social
                feed and other users will be able to view the compiled output.
              </p>
              <div className="p-3 rounded-lg border bg-muted">
                <p className="text-xs text-muted-foreground">Output URL</p>
                <p className="text-sm font-mono truncate">{outputUrl}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border bg-green-50 text-green-800">
              <p className="text-sm font-medium">
                Your notebook has been published to the social feed!
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
            {published ? 'Close' : 'Cancel'}
          </Button>
          {canPublish && !published && (
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                'Publishing...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publish to Feed
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
