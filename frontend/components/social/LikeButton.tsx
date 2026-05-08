'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocialStore } from '@/stores/social-store';
import { useAuthStore } from '@/stores/auth-store';
import { savePendingAction } from '@/lib/pending-auth-action';

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
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const liked = isLiked(notebookId);
  const storedCount = notebookLikeCounts[notebookId] || 0;
  const displayCount = propLikeCount !== undefined ? propLikeCount : storedCount;

  const handleToggle = async () => {
    if (isLoading) return;

    if (!isAuthenticated) {
      savePendingAction({
        type: 'like',
        notebookId,
        returnPath: pathname || `/notebooks/${notebookId}`,
      });
      router.push('/login');
      return;
    }

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
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className={`group/like flex items-center gap-2 rounded-full transition-all duration-300 ${
        liked 
          ? 'text-red-500 hover:bg-red-500/10 hover:text-red-600' 
          : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
      }`}
    >
      <div className="p-2 rounded-full transition-colors duration-300">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart 
            className={`h-5 w-5 transition-all duration-300 ${
              liked ? 'fill-current scale-110' : 'group-hover/like:scale-110'
            }`} 
          />
        )}
      </div>
      {showCount && displayCount > 0 && (
        <span className="text-sm font-semibold tabular-nums pr-1">{displayCount}</span>
      )}
    </Button>
  );
}
