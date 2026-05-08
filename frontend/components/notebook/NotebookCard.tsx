'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Calendar, User, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { InlineNotebookOutput } from './NotebookOutputViewer';
import { useSocialStore } from '@/stores/social-store';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';

interface NotebookCardProps {
  notebook: NotebookResponse;
}

export function NotebookCard({ notebook }: NotebookCardProps) {
  const { isLiked, toggleLike } = useSocialStore();

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleLike(notebook.id);
  };

  const liked = isLiked(notebook.id);

  const bannerThumb = notebook.banner_thumbnail_url;

  return (
    <Link href={`/notebooks/${notebook.id}`} className="block group">
      <Card className="relative h-full overflow-hidden border-border/60 bg-card/40 backdrop-blur-md shadow-md transition-all duration-500 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
        {/* Premium accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-secondary/60 to-primary/60 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        
        {bannerThumb && (
          <div className="relative w-full overflow-hidden bg-muted" style={{ aspectRatio: '16 / 9' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerThumb}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-3 pt-5 px-5">
          <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-foreground/90 group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-3">
            {notebook.title}
          </h3>
          <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 ring-1 ring-border shadow-sm">
                {(notebook.user?.avatar_url || notebook.avatar_url) ? (
                  <AvatarImage 
                    src={(notebook.user?.avatar_url || notebook.avatar_url) as string} 
                    alt={notebook.user?.username || notebook.username || 'user avatar'} 
                  />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {(notebook.user?.username || notebook.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="truncate max-w-[100px]">
                @{notebook.user?.username || notebook.username || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto opacity-70">
              <Calendar className="h-3 w-3" />
              <span>{formatRelativeTime(notebook.created_at)}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-5 px-5 border-t border-border/40 bg-muted/10">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-red-500/80">
                <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                <span className="text-xs font-bold tabular-nums">{notebook.like_count || 0}</span>
              </div>
              
              <div className="flex items-center gap-1 text-muted-foreground/80">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs font-bold tabular-nums">{notebook.comment_count || 0}</span>
              </div>

              {notebook.view_count !== undefined && (
                <div className="flex items-center gap-1 text-muted-foreground/40">
                  <Eye className="h-4 w-4" />
                  <span className="text-[10px] font-bold tabular-nums uppercase">{notebook.view_count || 0}</span>
                </div>
              )}
            </div>
            
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60 opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
              View Project →
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
