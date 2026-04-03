'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { InlineNotebookOutput } from './NotebookOutputViewer';
import { useSocialStore } from '@/stores/social-store';
import { apiClient, NotebookResponse } from '@/lib/api-client';

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

  return (
    <Link href={`/notebooks/${notebook.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <h3 className="text-xl font-semibold mb-2 line-clamp-2">{notebook.title}</h3>
          {notebook.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {notebook.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                {notebook.user?.avatar_url ? (
                  <AvatarImage src={notebook.user.avatar_url} alt={notebook.user.username} />
                ) : (
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {notebook.user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="truncate max-w-[120px]">{notebook.user?.username || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(notebook.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Inline preview of notebook output */}
          {notebook.output_url && (
            <div className="mb-4">
              <InlineNotebookOutput
                outputUrl={notebook.output_url}
                className="w-full h-64"
              />
            </div>
          )}

          {/* Engagement stats */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className={liked ? 'text-red-500 hover:text-red-600' : ''}
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
              {notebook.like_count || 0}
            </Button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>{notebook.comment_count || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
