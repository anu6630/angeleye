'use client';

import { useState } from 'react';
import { CommentResponse } from '@/lib/api-client';
import { CommentForm } from './CommentForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const MAX_DEPTH = 3;

interface CommentItemProps {
  comment: CommentResponse;
  depth?: number;
  notebookId: number;
}

export function CommentItem({
  comment,
  depth = 0,
  notebookId,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const canReply = depth < MAX_DEPTH;

  const handleReplySubmitted = () => {
    setIsReplying(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          {comment.avatar_url ? (
            <AvatarImage src={comment.avatar_url} alt={comment.username} />
          ) : (
            <AvatarFallback className="text-xs bg-muted">
              {comment.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Comment header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.username}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>

          {/* Comment content */}
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Reply button */}
          {canReply && (
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          )}

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm
                notebookId={notebookId}
                parentId={comment.id}
                placeholder={`Reply to ${comment.username}...`}
                onCancel={() => setIsReplying(false)}
                onSubmitted={handleReplySubmitted}
              />
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  notebookId={notebookId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
