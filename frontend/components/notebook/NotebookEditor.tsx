'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Save,
  FileText,
  Loader2,
  Send,
  Play,
  Paperclip,
  X,
  Info,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { useNotebookStore } from '@/stores/notebook-store';
import { useCompilationStore } from '@/stores/compilation-store';
import { apiClient } from '@/lib/api-client';
import { NotebookCell } from './NotebookCell';
import { PublishDialog } from './PublishDialog';

const ACCEPTED_BANNER_TYPES = 'image/png,image/jpeg,image/webp';
const MAX_BANNER_BYTES = 10 * 1024 * 1024;

interface NotebookEditorProps {
  notebookId?: number;
}

// Flat-file types accepted for local WASM execution
const ACCEPTED_DATA_TYPES =
  '.csv,.tsv,.txt,.json,.parquet,.xlsx,.xls';

export function NotebookEditor({ notebookId: propNotebookId }: NotebookEditorProps) {
  const {
    cells,
    title,
    isSaving,
    isRunningAll,
    attachedDataset,
    notebookId: storeNotebookId,
    setTitle,
    addCell,
    deleteCell,
    executeCell,
    runAll,
    attachDataset,
    detachDataset,
    reset,
    saveNotebook,
    loadNotebook,
  } = useNotebookStore();

  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const { resetCompilation } = useCompilationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [bannerThumbUrl, setBannerThumbUrl] = useState<string | null>(null);
  const [bannerFullUrl, setBannerFullUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const effectiveNotebookId = propNotebookId || storeNotebookId;

  useEffect(() => {
    if (propNotebookId) {
      loadNotebook(propNotebookId);
    } else {
      reset();
      resetCompilation();
    }
    return () => {
      reset();
      resetCompilation();
    };
  }, [propNotebookId, loadNotebook, reset, resetCompilation]);

  const refreshBannerUrls = useCallback(async (id: number) => {
    try {
      const nb = await apiClient.getNotebook(id);
      setBannerFullUrl(nb.banner_url || null);
      setBannerThumbUrl(nb.banner_thumbnail_url || null);
    } catch {
      // best-effort; leave existing values
    }
  }, []);

  useEffect(() => {
    if (effectiveNotebookId) {
      refreshBannerUrls(effectiveNotebookId);
    } else {
      setBannerFullUrl(null);
      setBannerThumbUrl(null);
    }
  }, [effectiveNotebookId, refreshBannerUrls]);

  // Lazily load (and cache) Pyodide on first interaction
  const ensurePyodide = async (): Promise<any> => {
    if (pyodide) return pyodide;
    setIsPyodideLoading(true);
    setPyodideError(null);
    try {
      const { loadPyodideInstance } = await import('@/lib/pyodide-loader');
      const instance = await loadPyodideInstance();
      setPyodide(instance);
      return instance;
    } catch (err: any) {
      const msg = err?.message || 'Failed to load Pyodide';
      setPyodideError(msg);
      throw err;
    } finally {
      setIsPyodideLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveNotebook();
    } catch (error) {
      console.error('Failed to save notebook:', error);
    }
  };

  const handleRunCell = async (id: string) => {
    try {
      const py = await ensurePyodide();
      await executeCell(id, py);
    } catch (error) {
      console.error('Failed to execute cell:', error);
    }
  };

  const handleRunAll = async () => {
    try {
      const py = await ensurePyodide();
      await runAll(py);
    } catch (error) {
      console.error('Failed to run all cells:', error);
    }
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Load Pyodide in background; dataset is stored and mounted when first run
    const py = pyodide; // may be null — attachDataset handles both cases
    await attachDataset(file, py);
    // Reset input so the same file can be re-selected if detached
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDetach = () => {
    detachDataset(pyodide);
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (bannerInputRef.current) bannerInputRef.current.value = '';
    if (!file) return;
    if (!effectiveNotebookId) {
      setBannerError('Save the notebook first.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setBannerError('Banner must be PNG, JPEG, or WEBP.');
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setBannerError('Banner exceeds 10 MB limit.');
      return;
    }
    setBannerError(null);
    setBannerUploading(true);
    try {
      const res = await apiClient.uploadBanner(effectiveNotebookId, file);
      setBannerFullUrl(res.banner_url);
      setBannerThumbUrl(res.banner_thumbnail_url);
    } catch (err: any) {
      setBannerError(err?.message || 'Failed to upload banner.');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleBannerRemove = async () => {
    if (!effectiveNotebookId) return;
    setBannerError(null);
    setBannerUploading(true);
    try {
      await apiClient.deleteBanner(effectiveNotebookId);
      setBannerFullUrl(null);
      setBannerThumbUrl(null);
    } catch (err: any) {
      setBannerError(err?.message || 'Failed to remove banner.');
    } finally {
      setBannerUploading(false);
    }
  };

  const canPublish = !!effectiveNotebookId;
  const pyodideReady = !!pyodide;

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Workflow banner */}
        <div className="mb-8 rounded-2xl border border-border/80 bg-muted/30 p-4 md:p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workflow
          </p>
          <ol className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2 md:gap-4">
            <li>
              <span className="font-semibold text-foreground">1. Edit & run</span> — cells execute
              in the browser (Pyodide) with numpy, pandas, and matplotlib pre-loaded.
            </li>
            <li>
              <span className="font-semibold text-foreground">2. Publish</span> — runs a clean
              server build in an isolated container, then pushes to the feed.
            </li>
          </ol>
        </div>

        {/* Banner */}
        <div className="mb-6">
          {bannerThumbUrl ? (
            <div className="group relative w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/20"
                 style={{ aspectRatio: '16 / 6' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerThumbUrl}
                alt="Notebook banner"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  disabled={bannerUploading}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <ImagePlus className="mr-1 h-4 w-4" />
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-full"
                  disabled={bannerUploading}
                  onClick={handleBannerRemove}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!effectiveNotebookId) {
                  setBannerError('Save the notebook first.');
                  return;
                }
                bannerInputRef.current?.click();
              }}
              disabled={bannerUploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 px-4 py-10 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 disabled:opacity-60"
              style={{ minHeight: 140 }}
            >
              {bannerUploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
              <span className="font-medium text-foreground">
                {effectiveNotebookId ? 'Add a banner' : 'Save the notebook to enable banner'}
              </span>
              <span className="text-xs">PNG, JPEG, or WEBP — up to 10 MB</span>
            </button>
          )}
          {bannerError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{bannerError}</p>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept={ACCEPTED_BANNER_TYPES}
            className="hidden"
            onChange={handleBannerSelect}
          />
        </div>

        {/* Notebook title */}
        <div className="mb-6 flex items-center gap-4">
          <FileText className="h-8 w-8 shrink-0 text-primary" aria-hidden />
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled notebook"
            className="font-display border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight placeholder:text-muted-foreground focus-visible:ring-0 md:text-3xl"
          />
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="rounded-full">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleRunAll}
            disabled={isRunningAll || isPyodideLoading || cells.filter((c) => c.cell_type === 'code').length === 0}
            title="Run all code cells top-to-bottom in the browser"
          >
            {isRunningAll || isPyodideLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPyodideLoading ? 'Loading Python…' : 'Running…'}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run All
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            className="rounded-full"
            onClick={() => setShowPublishDialog(true)}
            disabled={!canPublish}
            title={!canPublish ? 'Save your notebook first' : ''}
          >
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>

        {/* Pyodide error banner */}
        {pyodideError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Python runtime failed to load: {pyodideError}</span>
          </div>
        )}

        {/* Local dataset attachment */}
        <div className="mb-6 rounded-xl border border-border/70 bg-muted/20 p-4">
          <p className="mb-2 text-sm font-medium">Local data file (for browser runs)</p>
          {attachedDataset ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {attachedDataset.name}
                </span>
                <button
                  onClick={handleDetach}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  aria-label="Remove attached file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="rounded bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                pd.read_csv(&apos;{attachedDataset.name}&apos;)
              </p>
              <p className="text-xs text-muted-foreground">
                Use the filename above as a relative path. This file is only available during
                browser runs — upload it as a dataset and select it in the Publish dialog for
                server compilation.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                Attach file
              </Button>
              <p className="text-xs text-muted-foreground">
                CSV, TSV, TXT, JSON, Parquet, Excel — max 100 MB
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_DATA_TYPES}
            className="hidden"
            onChange={handleFileAttach}
          />
        </div>

        {/* Cells */}
        <div className="space-y-4">
          {cells.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 py-14 text-center">
              <p className="mb-4 text-muted-foreground">Start with a cell</p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => addCell('code')}>
                  Code
                </Button>
                <Button variant="outline" onClick={() => addCell('markdown')}>
                  Text
                </Button>
              </div>
            </div>
          ) : (
            cells.map((cell: any) => (
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
                onAddCell={(type) => addCell(type)}
              />
            ))
          )}
        </div>

        {cells.length > 0 && (
          <div className="mt-4 flex gap-2">
            <Button onClick={() => addCell('code')} variant="outline">
              + Code
            </Button>
            <Button onClick={() => addCell('markdown')} variant="outline">
              + Text
            </Button>
          </div>
        )}
      </div>

      <PublishDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        notebookId={effectiveNotebookId || null}
      />
    </>
  );
}
