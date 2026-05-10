'use client';

import { useState, useEffect } from 'react';
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
import { useNotebookStore } from '@/stores/notebook-store';
import { useToast } from '@/hooks/use-toast';
import { apiClient, type GroupPublic } from '@/lib/api-client';
import {
  Send,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  ExternalLink,
} from 'lucide-react';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: number | null;
  /** When set, pre-select this group in the audience control (must be one of your memberships). */
  defaultGroupSlug?: string | null;
}

export function PublishDialog({
  open,
  onOpenChange,
  notebookId,
  defaultGroupSlug = null,
}: PublishDialogProps) {
  const { toast } = useToast();
  const {
    isCompiling,
    compilationStatus,
    compilationResult,
    datasets: datasetsRaw,
    isLoadingDatasets,
    compileNotebook,
    loadDatasets,
    publishNotebook,
    outputUrl,
    outputKey,
  } = useCompilationStore();
  const datasets = datasetsRaw ?? [];

  const [localDataset, setLocalDataset] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  /** Hide dataset picker after user starts a run; reset on error so they can retry. */
  const [flowStarted, setFlowStarted] = useState(false);
  const [myGroups, setMyGroups] = useState<GroupPublic[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [audienceGroupId, setAudienceGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      loadDatasets();
      setPublished(false);
      setFlowError(null);
      setFlowStarted(false);
    }
  }, [open, loadDatasets]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setGroupsLoading(true);
    apiClient
      .getMyGroupsHub()
      .then((hub) => {
        if (cancelled) return;
        setMyGroups(hub.groups);
        if (defaultGroupSlug) {
          const m = hub.groups.find((g) => g.slug === defaultGroupSlug);
          setAudienceGroupId(m ? m.id : null);
        } else {
          setAudienceGroupId(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMyGroups([]);
          setAudienceGroupId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, defaultGroupSlug]);

  const { saveNotebook } = useNotebookStore();
  const busy = isCompiling || isPublishing;

  const runPublish = async () => {
    if (!notebookId) return;
    setFlowError(null);
    setFlowStarted(true);

    try {
      // Always save latest cell content before compiling so the server
      // builds what the user actually typed, not stale DB content.
      await saveNotebook();
      await compileNotebook(notebookId, localDataset ?? undefined);
      const s = useCompilationStore.getState();
      if (s.compilationStatus !== 'success' || !s.outputKey) {
        const msg =
          s.compilationResult?.error ||
          s.compilationResult?.result?.error ||
          'Compilation did not finish successfully. Fix any errors and try again.';
        throw new Error(msg);
      }

      const key = s.outputKey;
      setIsPublishing(true);
      await publishNotebook(
        notebookId,
        key,
        localDataset ?? undefined,
        audienceGroupId
      );
      setPublished(true);
      toast({
        title: 'Published',
        description: audienceGroupId
          ? 'Your notebook was posted to the group.'
          : 'Your notebook is live on the feed.',
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Publish failed';
      setFlowError(message);
      setFlowStarted(false);
      toast({
        variant: 'destructive',
        title: 'Publish failed',
        description: message,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDialogChange = (next: boolean) => {
    if (!next) {
      setPublished(false);
      setFlowError(null);
      onOpenChange(false);
    }
  };

  const statusMessage = () => {
    if (!notebookId) return 'Save your notebook before publishing.';
    if (flowError) return flowError;
    if (published) {
      return audienceGroupId
        ? 'Your notebook has been published to the group.'
        : 'Your notebook has been published to the social feed.';
    }
    if (isPublishing) return 'Publishing to the feed…';
    if (isCompiling || compilationStatus === 'pending' || compilationStatus === 'processing') {
      return compilationStatus === 'pending'
        ? 'Submitting build…'
        : 'Building your notebook in an isolated container…';
    }
    if (compilationStatus === 'failed') {
      const detail =
        compilationResult?.error ||
        compilationResult?.result?.error ||
        (!compilationResult
          ? 'No error details (often after a page reload). Try Publish again, or check the Celery worker logs.'
          : null);
      return `Build failed: ${detail || 'Unknown error'}`;
    }
    return 'Choose an optional dataset, then click Publish. We build on the server, then push to the feed.';
  };

  const statusIcon = () => {
    if (!notebookId) return <Save className="h-5 w-5 text-amber-500" />;
    if (published) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (flowError || compilationStatus === 'failed')
      return <XCircle className="h-5 w-5 text-red-500" />;
    if (busy) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
  };

  /** Keep visible even when persisted compilation state leaves `busy` true (avoids hiding audience after reload). */
  const showAudiencePicker = Boolean(notebookId) && !published && !flowStarted;
  const showDatasetPicker = showAudiencePicker && !busy;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish to feed</DialogTitle>
          <DialogDescription>
            One step: we run a production build of your notebook (same as when others view it), then
            publish that output to your profile and the feed. Browser runs are only for drafting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
            {statusIcon()}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Status</p>
              <p className="text-sm text-muted-foreground">{statusMessage()}</p>
            </div>
          </div>

          {!notebookId && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                Save the notebook first using the Save button in the editor.
              </p>
            </div>
          )}

          {showAudiencePicker && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="publish-audience">
                Audience
              </label>
              <p className="text-xs text-muted-foreground">
                Anyone: main feed and search. Group: not on the global feed; only this group&apos;s
                timeline. Private groups also restrict who can open the notebook page.
              </p>
              {groupsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your groups…
                </div>
              ) : (
                <select
                  id="publish-audience"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={audienceGroupId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAudienceGroupId(v === '' ? null : Number(v));
                  }}
                >
                  <option value="">Anyone (feed &amp; search)</option>
                  {myGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      Group: {g.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {showDatasetPicker && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Optional dataset</label>
              {isLoadingDatasets ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading datasets…
                </div>
              ) : datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No datasets uploaded.{' '}
                  <a href="/datasets" className="text-primary underline-offset-4 hover:underline">
                    Upload a dataset
                  </a>
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="publish-no-dataset"
                      name="publish-dataset"
                      checked={localDataset === null}
                      onChange={() => setLocalDataset(null)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="publish-no-dataset" className="cursor-pointer text-sm">
                      No dataset
                    </label>
                  </div>
                  {datasets.map((dataset) => (
                    <div key={dataset.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`publish-dataset-${dataset.id}`}
                        name="publish-dataset"
                        checked={localDataset === dataset.id}
                        onChange={() => setLocalDataset(dataset.id)}
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor={`publish-dataset-${dataset.id}`}
                        className="flex flex-1 cursor-pointer items-center gap-2 text-sm"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        <span>{dataset.original_filename}</span>
                        <span className="text-xs text-muted-foreground">
                          ({dataset.row_count ?? 0} rows)
                        </span>
                      </label>
                    </div>
                  ))}
                  {localDataset !== null && (() => {
                    const ds = datasets.find((d) => d.id === localDataset);
                    return ds ? (
                      <p className="rounded bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                        pd.read_csv(&apos;{ds.original_filename}&apos;)
                      </p>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {flowStarted && compilationStatus === 'success' && outputUrl && !published && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => window.open(outputUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview build output
            </Button>
          )}

          {published && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100">
              You can close this dialog or open the feed to see your notebook.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogChange(false)} disabled={busy}>
            {published ? 'Close' : 'Cancel'}
          </Button>
          {notebookId && !published && (
            <Button onClick={runPublish} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPublishing ? 'Publishing…' : isCompiling ? 'Building…' : 'Working…'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
