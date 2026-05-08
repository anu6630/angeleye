'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Heart, MessageCircle, Info, X, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { NotebookCellViewer } from './NotebookCellViewer';
import { CommentList } from '@/components/social/CommentList';
import { useSocialStore } from '@/stores/social-store';
import { useAuthStore } from '@/stores/auth-store';
import { savePendingAction } from '@/lib/pending-auth-action';
import { ForkButton } from '@/components/social/ForkButton';
import { FollowButton } from '@/components/social/FollowButton';
import { ForkChain } from '@/components/social/ForkChain';
import { EngagementMetrics } from '@/components/social/EngagementMetrics';
import { formatRelativeTime } from '@/lib/utils';

// CSS injected into the iframe to hide ALL code source — outputs and markdown only.
// Covers both JupyterLab (.jp-*) and classic nbconvert (.input, .prompt) class names.
const HIDE_CODE_CSS = `
  /* JupyterLab nbconvert */
  .jp-CodeCell .jp-InputArea,
  .jp-CodeCell .jp-Cell-inputCollapser,
  .jp-CodeCell .jp-InputPrompt,
  .jp-CodeCell .jp-CodeMirrorEditor,
  .jp-CodeCell .jp-Editor,
  .jp-InputPrompt,
  .jp-OutputArea-prompt,
  /* Classic nbconvert */
  .input, .input_area,
  div.input, div.input_area,
  .prompt.input_prompt,
  div.prompt.input_prompt,
  .CodeMirror,
  /* Any remaining input prompt numbers (In [n]:) */
  .in_prompt, .output_prompt { display: none !important; }

  /* Remove excess padding from hidden areas */
  .jp-Cell { padding: 4px 0 !important; }
  .cell { padding: 4px 0 !important; }
  body { padding: 16px !important; background: transparent !important; margin: 0 !important; }
  .jp-OutputArea-output { padding: 4px 0 !important; }
  .output_area { padding: 4px 0 !important; }
`;

interface NotebookViewerProps {
  notebookId: number;
}

export function NotebookViewer({ notebookId }: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outputHtml, setOutputHtml] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [bannerShrunk, setBannerShrunk] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { isLiked, toggleLike } = useSocialStore();
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadNotebook() {
      try {
        setIsLoading(true);
        const data = await apiClient.getNotebook(notebookId);
        setNotebook(data);

        // Fetch the compiled HTML so we can serve it via srcdoc (avoids
        // cross-origin issues and lets us inject CSS to hide code).
        if (data.output_s3_key) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
          const res = await fetch(`${apiBase}/notebooks/${notebookId}/output`);
          if (res.ok) {
            const html = await res.text();
            setOutputHtml(html);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load notebook');
      } finally {
        setIsLoading(false);
      }
    }
    loadNotebook();
  }, [notebookId]);

  useEffect(() => {
    if (!notebook?.banner_url) {
      setBannerShrunk(false);
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let raf = 0;
    const evaluate = () => {
      raf = 0;
      const top = sentinel.getBoundingClientRect().top;
      // The sentinel sits just below the full banner. Once its top scrolls above
      // the viewport, we collapse to a thin sticky strip; when it returns into
      // view we reveal the full banner again.
      setBannerShrunk(top < 0);
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(evaluate);
    };
    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [notebook?.banner_url]);

  // Inject hide-code CSS into the compiled HTML for the default (output-only) view.
  // Falls back to prepending a <style> tag if </head> is absent (fragment output).
  const outputsOnlyHtml = useCallback((html: string) => {
    const styleTag = `<style>${HIDE_CODE_CSS}</style>`;
    if (html.includes('</head>')) return html.replace('</head>', `${styleTag}</head>`);
    if (html.includes('<body')) return html.replace('<body', `${styleTag}<body`);
    return styleTag + html;
  }, []);

  const resizeIframeToContent = useCallback((iframe: HTMLIFrameElement, padding: number) => {
    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const body = doc.body;
        const html = doc.documentElement;
        const h = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          html?.scrollHeight || 0,
          html?.offsetHeight || 0
        );
        if (h > 50) {
          iframe.style.height = `${h + padding}px`;
        }
      } catch {
        // Ignore cross-document access issues.
      }
    };

    // First paint
    adjustHeight();
    // Embedded outputs (e.g. chart images) can increase height after onLoad.
    window.setTimeout(adjustHeight, 100);
    window.setTimeout(adjustHeight, 400);
    window.setTimeout(adjustHeight, 1000);
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: notebook?.title || 'Notebook', url }); }
      catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleLike = () => {
    if (!notebook) return;

    if (!isAuthenticated) {
      savePendingAction({
        type: 'like',
        notebookId,
        returnPath: pathname || `/notebooks/${notebookId}`,
      });
      router.push('/login');
      return;
    }

    toggleLike(notebookId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !notebook) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error || 'Notebook not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const liked = isLiked(notebookId);
  const hasCompiledOutput = Boolean(outputHtml);

  const hasBanner = Boolean(notebook.banner_url);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Sticky breadcrumb */}
      <div className="sticky top-14 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-12 max-w-4xl items-center px-4">
          <Link href="/feed">
            <Button variant="ghost" size="sm" className="rounded-full -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Feed
            </Button>
          </Link>
          {hasCompiledOutput && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full ml-auto gap-2 text-muted-foreground"
              onClick={() => setShowSource((s) => !s)}
              title={showSource ? 'Back to output view' : 'Show source & output'}
            >
              {showSource ? (
                <><X className="h-4 w-4" /> Hide source</>
              ) : (
                <><Info className="h-4 w-4" /> View source</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Sticky thin banner strip — appears once user scrolls past the full banner */}
      {hasBanner && (
        <div
          aria-hidden={!bannerShrunk}
          className={`sticky top-[6.5rem] z-30 overflow-hidden border-b border-border/80 bg-background transition-[height,opacity] duration-300 ease-out ${
            bannerShrunk ? 'h-12 opacity-100' : 'pointer-events-none h-0 opacity-0'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={notebook.banner_thumbnail_url || notebook.banner_url || ''}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      )}

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Full-resolution banner (collapses naturally as user scrolls; mirror appears as sticky strip) */}
        {hasBanner && (
          <>
            <section
              className="relative mb-6 w-full overflow-hidden rounded-2xl border border-border/80 bg-muted"
              style={{ aspectRatio: '16 / 6', maxHeight: 360 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={notebook.banner_url!}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </section>
            <div ref={sentinelRef} aria-hidden className="-mt-2 h-1 w-full" />
          </>
        )}

        {/* Meta card */}
        <Card className="mb-6 overflow-hidden border-border/80 shadow-sm">
          <CardHeader>
            <h1 className="font-display mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {notebook.title}
            </h1>
            <ForkChain notebookId={notebook.id} variant="full" className="mb-4" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {(notebook.user?.avatar_url || notebook.avatar_url) ? (
                      <AvatarImage
                        src={(notebook.user?.avatar_url || notebook.avatar_url) as string}
                        alt={notebook.user?.username || notebook.username || 'avatar'}
                      />
                    ) : (
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {(notebook.user?.username || notebook.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{notebook.user?.username || notebook.username || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatRelativeTime(notebook.created_at)}</span>
                </div>
              </div>
              {(notebook.user || notebook.user_id) && (
                <FollowButton
                  userId={notebook.user?.id || notebook.user_id}
                  username={notebook.user?.username || notebook.username || 'unknown'}
                  size="sm"
                  showText={true}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <EngagementMetrics
              likes={notebook.like_count}
              comments={notebook.comment_count}
              views={notebook.view_count || 0}
              variant="full"
              showZeroState={true}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={liked ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={handleLike}
              >
                <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-current' : ''}`} />
                Like
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" disabled>
                <MessageCircle className="mr-2 h-4 w-4" />
                Comments ({notebook.comment_count})
              </Button>
              <ForkButton notebookId={notebook.id} notebookTitle={notebook.title} />
              <Button variant="outline" size="sm" className="rounded-full" onClick={handleShare}>
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Content area ─────────────────────────────────────── */}
        {hasCompiledOutput ? (
          showSource ? (
            /* Source view: full Jupyter HTML including code + output */
            <Card className="mb-8 overflow-hidden border-border/80 shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-xs text-muted-foreground">
                <Code2 className="h-3.5 w-3.5" />
                Source view — code &amp; rendered output
              </div>
              <CardContent className="p-0">
                <iframe
                  srcDoc={outputHtml!}
                  className="w-full border-0"
                  style={{ minHeight: '500px' }}
                  onLoad={(e) => {
                    resizeIframeToContent(e.currentTarget, 40);
                  }}
                  title={`${notebook.title} — source`}
                />
              </CardContent>
            </Card>
          ) : (
            /* Default view: outputs only (code hidden via CSS) */
            <Card className="mb-8 overflow-hidden border-border/80 shadow-sm">
              <CardContent className="p-0">
                <iframe
                  srcDoc={outputsOnlyHtml(outputHtml!)}
                  className="w-full border-0"
                  style={{ minHeight: '80px' }}
                  onLoad={(e) => {
                    resizeIframeToContent(e.currentTarget, 24);
                  }}
                  title={`${notebook.title} — output`}
                />
              </CardContent>
            </Card>
          )
        ) : (
          /* No compiled output: show cells rendered cleanly */
          <div className="space-y-4 mb-8">
            {notebook.cells?.map((cell) => (
              <NotebookCellViewer key={cell.id || cell.order_index} cell={cell} />
            ))}
          </div>
        )}

        <CommentList notebookId={notebookId} commentCount={notebook.comment_count} />
      </div>
    </div>
  );
}
