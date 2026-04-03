'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocialStore } from '@/stores/social-store';

interface LikeButtonProps {
  notebookId: number;
  likeCount?: number;
  showCount?: boolean;
}

export function LikeButton({
  notebookId,
  likeCount: propLikeCount,
  showCount = true,
}: LikeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toggleLike, isLiked, notebookLikeCounts } = useSocialStore();

  const liked = isLiked(notebookId);
  const storedCount = notebookLikeCounts[notebookId] || 0;
  const displayCount = propLikeCount !== undefined ? propLikeCount : storedCount;

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await toggleLike(notebookId);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={liked ? 'default' : 'ghost'}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-current' : ''}`} />
      )}
      {showCount && (
        <span className="ml-1">{displayCount}</span>
      )}
    </Button>
  );
}
