'use client';

import { MessageCircle, Eye } from 'lucide-react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EngagementMetricsProps {
  likes: number;
  comments: number;
  views: number;
  variant?: 'full' | 'compact';
  className?: string;
  showZeroState?: boolean;
  hideLikes?: boolean;
}

export function EngagementMetrics({
  likes,
  comments,
  views,
  variant = 'compact',
  className,
  showZeroState = false,
  hideLikes = false,
}: EngagementMetricsProps) {
  const totalEngagement = likes + comments + views;

  // Per CONTEXT.md D-32: Zero state logic (don't show "0", feels dead)
  if (!showZeroState && totalEngagement === 0) {
    return null;
  }

  // Zero state for detail page
  if (showZeroState && totalEngagement === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        Be the first to like this notebook
      </div>
    );
  }

  // Compact variant (mobile/feed cards): Icons + numbers only
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-4 text-sm text-muted-foreground', className)}>
        {!hideLikes && likes > 0 && (
          <div className="flex items-center gap-1" title={`${likes} likes`}>
            <Heart className="h-4 w-4" />
            <span>{likes}</span>
          </div>
        )}
        {comments > 0 && (
          <div className="flex items-center gap-1" title={`${comments} comments`}>
            <MessageCircle className="h-4 w-4" />
            <span>{comments}</span>
          </div>
        )}
        {views > 0 && (
          <div className="flex items-center gap-1" title={`${views} views`}>
            <Eye className="h-4 w-4" />
            <span>{views}</span>
          </div>
        )}
      </div>
    );
  }

  // Full variant (desktop/detail page): Icons + numbers + labels
  return (
    <div className={cn('flex items-center gap-6 text-sm', className)}>
      {!hideLikes && likes > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Heart className="h-4 w-4" />
          <span>{likes}</span>
          <span className="text-xs">likes</span>
        </div>
      )}
      {comments > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
          <span>{comments}</span>
          <span className="text-xs">comments</span>
        </div>
      )}
      {views > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{views}</span>
          <span className="text-xs">views</span>
        </div>
      )}
    </div>
  );
}
