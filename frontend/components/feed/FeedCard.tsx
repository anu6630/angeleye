'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/social/LikeButton';
import { ShareButton } from '@/components/social/ShareButton';
import { ForkButton } from '@/components/social/ForkButton';
import { EngagementMetrics } from '@/components/social/EngagementMetrics';
import { Button } from '@/components/ui/button';
import { NotebookResponse } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';

interface FeedCardProps {
  notebook: NotebookResponse;
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
`;

function NotebookPreview({ notebookId, outputUrl }: { notebookId: number; outputUrl: string }) {
  const [html, setHtml] = useState<string | null>(null);

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

  if (!html) return (
    <div className="h-[300px] w-full bg-muted/20 animate-pulse flex items-center justify-center">
      <p className="text-xs text-muted-foreground">Loading preview...</p>
    </div>
  );

  return (
    <div className="relative w-full h-[350px] overflow-hidden border-y border-border/40 bg-card">
      <iframe
        srcDoc={html}
        className="w-full h-full border-0 pointer-events-none"
        title="Notebook preview"
      />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}

export function FeedCard({ notebook }: FeedCardProps) {
  const {
    id,
    title,
    user,
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
    <Card className="group overflow-hidden border-border/80 bg-card/90 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
      <CardHeader className="pb-3 pt-4">
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
              <p className="text-sm font-bold leading-none tracking-tight">@{username}</p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                {formatRelativeTime(created_at)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full">
            <span className="sr-only">More options</span>
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
            >
              <path
                d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.12132 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
      </CardHeader>

      <Link href={`/notebooks/${id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <CardContent className="pb-4">
          <h3 className="font-display text-xl font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors">
            {title}
          </h3>
        </CardContent>

        {output_url ? (
          <NotebookPreview notebookId={id} outputUrl={output_url} />
        ) : bannerThumb && (
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
        )}
      </Link>

      <CardFooter className="flex flex-col gap-4 py-4">
        {/* Engagement metrics row */}
        <div className="flex items-center justify-between w-full px-1">
          <EngagementMetrics
            likes={like_count}
            comments={comment_count}
            views={view_count}
            variant="compact"
            hideLikes={true}
          />
        </div>

        {/* Separator */}
        <div className="h-px w-full bg-border/40" />

        {/* Action buttons row */}
        <div className="flex items-center justify-between w-full px-1">
          <div className="flex items-center gap-6">
            <LikeButton notebookId={id} likeCount={like_count} showCount={true} />
            <Link href={`/notebooks/${id}#comments`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group/comment">
              <div className="p-2 rounded-full group-hover/comment:bg-muted transition-colors">
                <MessageCircle className="h-5 w-5" />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ForkButton
              notebookId={id}
              notebookTitle={title}
              variant="ghost"
              size="icon"
              showText={false}
              className="rounded-full hover:bg-muted"
            />
            <ShareButton
              title={title}
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/notebooks/${id}`}
              className="rounded-full hover:bg-muted"
            />
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
