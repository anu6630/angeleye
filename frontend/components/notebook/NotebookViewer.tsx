'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Heart, MessageCircle, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { NotebookCellViewer } from './NotebookCellViewer';
import { useSocialStore } from '@/stores/social-store';

interface NotebookViewerProps {
  notebookId: number;
}

export function NotebookViewer({ notebookId }: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLiked, toggleLike, loadComments, getComments, getCommentCount } = useSocialStore();

  useEffect(() => {
    async function loadNotebook() {
      try {
        setIsLoading(true);
        const data = await apiClient.getNotebook(notebookId);
        setNotebook(data);

        // Load comments
        loadComments(notebookId);
      } catch (err: any) {
        setError(err.message || 'Failed to load notebook');
      } finally {
        setIsLoading(false);
      }
    }

    loadNotebook();
  }, [notebookId, loadComments]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: notebook?.title || 'Notebook',
          url,
        });
      } catch (err) {
        // User cancelled or error
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      // Could show toast here
    }
  };

  const handleLike = () => {
    if (notebook) {
      toggleLike(notebookId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notebook...</p>
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

  const comments = getComments(notebookId);
  const commentCount = getCommentCount(notebookId) || notebook.comment_count;
  const liked = isLiked(notebookId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/feed">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Notebook header */}
        <Card className="mb-6">
          <CardHeader>
            <h1 className="text-3xl font-bold mb-4">{notebook.title}</h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {notebook.user?.avatar_url ? (
                    <AvatarImage src={notebook.user.avatar_url} alt={notebook.user.username} />
                  ) : (
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {notebook.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span>{notebook.user?.username || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(notebook.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Button
              variant={liked ? 'default' : 'outline'}
              size="sm"
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-current' : ''}`} />
              {notebook.like_count}
            </Button>
            <Button variant="outline" size="sm" disabled>
              <MessageCircle className="h-4 w-4 mr-2" />
              {commentCount}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Notebook cells - read-only display (VIEW-05) */}
        <div className="space-y-4 mb-8">
          {notebook.cells?.map((cell) => (
            <NotebookCellViewer key={cell.id || cell.order_index} cell={cell} />
          ))}
        </div>

        {/* Comments section - placeholder, will be in Plan 07 */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Comments</h2>
          </CardHeader>
          <CardContent>
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        {comment.avatar_url ? (
                          <AvatarImage src={comment.avatar_url} alt={comment.username} />
                        ) : (
                          <AvatarFallback className="text-xs bg-muted">
                            {comment.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
