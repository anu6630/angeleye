'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSocialStore } from '@/stores/social-store';

interface CommentFormProps {
  notebookId: number;
  parentId?: number;
  placeholder?: string;
  onCancel?: () => void;
  onSubmitted?: () => void;
}

export function CommentForm({
  notebookId,
  parentId,
  placeholder = 'Add a comment...',
  onCancel,
  onSubmitted,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createComment } = useSocialStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment(notebookId, content.trim(), parentId);
      setContent('');

      if (onSubmitted) {
        onSubmitted();
      }

      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-h-[60px] resize-none"
        disabled={isSubmitting}
      />
      <div className="flex flex-col gap-2">
        <Button type="submit" size="sm" disabled={!content.trim() || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
