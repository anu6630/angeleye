'use client';

import { useEffect } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { useSocialStore } from '@/stores/social-store';

interface CommentListProps {
  notebookId: number;
  commentCount?: number;
}

export function CommentList({ notebookId, commentCount: propCommentCount }: CommentListProps) {
  const {
    getComments,
    getCommentCount,
    loadComments,
    isLoading,
  } = useSocialStore();

  const comments = getComments(notebookId);
  const commentCount = getCommentCount(notebookId) || propCommentCount || 0;

  useEffect(() => {
    // Load comments on mount
    loadComments(notebookId);
  }, [notebookId, loadComments]);

  return (
    <div>
      {/* Comments header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5" />
        <h2 className="text-lg font-semibold">
          Comments ({commentCount})
        </h2>
      </div>

      {/* Empty state */}
      {comments.length === 0 && !isLoading && (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <MessageCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      )}

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              notebookId={notebookId}
            />
          ))}
        </div>
      )}

      {/* New comment form */}
      {comments.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <CommentForm notebookId={notebookId} />
        </div>
      )}

      {/* Only comment form if no comments */}
      {comments.length === 0 && (
        <CommentForm notebookId={notebookId} />
      )}

      {/* Loading state */}
      {isLoading && comments.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
