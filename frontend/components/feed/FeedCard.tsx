'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MessageCircle, Eye } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/social/LikeButton';
import { ShareButton } from '@/components/social/ShareButton';
import { ForkButton } from '@/components/social/ForkButton';
import { SavePostButton } from '@/components/social/SavePostButton';
import type { NotebookCard, NotebookResponse } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';

interface FeedCardProps {
  notebook: NotebookResponse | NotebookCard;
  /** Called after save state successfully changes (e.g. remove card from Saved list). */
  onSavedChange?: (notebookId: number, saved: boolean) => void;
}

// CSS to hide code source in the feed preview
const HIDE_CODE_CSS = `
  .jp-CodeCell .jp-InputArea,
  .jp-CodeCell .jp-Cell-inputCollapser,
  .jp-CodeCell .jp-InputPrompt,
  .jp-CodeCell .jp-CodeMirrorEditor,
  .jp-CodeCell .jp-Editor,
  .jp-InputPrompt,
  .jp-OutputArea-prompt,
  .input, .input_area,
  div.input, div.input_area,
  .prompt.input_prompt,
  div.prompt.input_prompt,
  .CodeMirror,
  .in_prompt, .output_prompt { display: none !important; }

  .jp-Cell { padding: 4px 0 !important; }
  .cell { padding: 4px 0 !important; }
  body { padding: 12px !important; background: transparent !important; margin: 0 !important; overflow: hidden !important; }
  .jp-OutputArea-output { padding: 4px 0 !important; }
  .output_area { padding: 4px 0 !important; }
  #notebook-container, #notebook, .jp-Notebook, .jp-Cell-outputWrapper { min-height: 0 !important; height: auto !important; }
`;

function NotebookPreview({ notebookId }: { notebookId: number }) {
  const [html, setHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      
      // Get the scroll height of the body and html
      const body = doc.body;
      const htmlElement = doc.documentElement;
      
      const height = Math.max(
        body?.scrollHeight || 0,
        body?.offsetHeight || 0,
        htmlElement?.scrollHeight || 0,
        htmlElement?.offsetHeight || 0
      );

      if (height > 10) {
        // Set height with padding, capped at 400px for feed
        const finalHeight = Math.min(height + 20, 400);
        iframe.style.height = `${finalHeight}px`;
      }
    } catch (e) {
      // Ignore cross-origin errors
    }
  }, []);

  useEffect(() => {
    async function fetchOutput() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const res = await fetch(`${apiBase}/notebooks/${notebookId}/output`);
        if (res.ok) {
          const content = await res.text();
          const styleTag = `<style>${HIDE_CODE_CSS}</style>`;
          const finalHtml = content.includes('</head>')
            ? content.replace('</head>', `${styleTag}</head>`)
            : styleTag + content;
          setHtml(finalHtml);
        }
      } catch (err) {
        console.error('Failed to fetch notebook output for preview', err);
      }
    }
    fetchOutput();
  }, [notebookId]);

  // Extra resize triggers after content might have changed
  useEffect(() => {
    if (html) {
      const timer = setTimeout(resizeIframe, 500);
      return () => clearTimeout(timer);
    }
  }, [html, resizeIframe]);

  if (!html) return (
    <div className="h-[120px] w-full bg-muted/5 animate-pulse flex items-center justify-center border-y border-border/40">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/30 font-medium">Loading preview...</p>
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden border-y border-border/40 bg-card/50">
      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="w-full border-0 pointer-events-none transition-[height] duration-500 ease-in-out"
        style={{ height: '60px', minHeight: '40px' }} 
        onLoad={resizeIframe}
        title="Notebook preview"
      />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}

export function FeedCard({ notebook, onSavedChange }: FeedCardProps) {
  const {
    id,
    title,
    like_count,
    comment_count,
    view_count = 0,
    created_at,
    output_url,
  } = notebook;

  const username = (notebook.user?.username || notebook.username || 'Unknown');
  const avatar_url = (notebook.user?.avatar_url || notebook.avatar_url);
  const bannerThumb = notebook.banner_thumbnail_url;

  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/40 backdrop-blur-md shadow-lg transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5">
      {/* Premium top accent gradient */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/80 via-secondary/80 to-primary/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
              {avatar_url ? (
                <AvatarImage src={avatar_url} alt={username} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-semibold tracking-tight text-foreground/90">@{username}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5 uppercase tracking-[0.1em]">
                {formatRelativeTime(created_at)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <Link href={`/notebooks/${id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <CardContent className="pb-5 px-6">
          <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground/90 group-hover:text-primary transition-colors duration-300">
            {title}
          </h3>
        </CardContent>

        {bannerThumb ? (
          <div className="relative w-full overflow-hidden bg-muted border-y border-border/40">
            <div style={{ aspectRatio: '16 / 9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerThumb}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </div>
          </div>
        ) : output_url ? (
          <NotebookPreview notebookId={id} />
        ) : null}
      </Link>

      <CardFooter className="py-4 px-6 border-t border-border/40 bg-muted/20">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <LikeButton notebookId={id} likeCount={like_count} showCount={true} />
            
            <Link href={`/notebooks/${id}#comments`} className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-all duration-300 group/comment">
              <div className="p-2 rounded-full group-hover/comment:bg-blue-500/10 transition-colors">
                <MessageCircle className="h-5 w-5 transition-transform duration-300 group-hover/comment:scale-110" />
              </div>
              <span className="text-sm font-semibold tabular-nums">{comment_count > 0 ? comment_count : ''}</span>
            </Link>

            <SavePostButton
              notebookId={id}
              saveCount={notebook.save_count}
              showText={true}
              showCount={true}
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
              onSavedChange={onSavedChange}
            />

            {view_count > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground/50 ml-1 select-none">
                <Eye className="h-4 w-4" />
                <span className="text-[11px] font-bold tracking-wider tabular-nums uppercase">{view_count}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <ForkButton
              notebookId={id}
              notebookTitle={title}
              variant="ghost"
              size="icon"
              showText={false}
              className="rounded-full hover:bg-muted hover:text-primary transition-all duration-300 hover:scale-110"
            />
            <ShareButton
              title={title}
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/notebooks/${id}`}
              className="rounded-full hover:bg-muted hover:text-primary transition-all duration-300 hover:scale-110"
            />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
