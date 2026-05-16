'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FeedCard } from './FeedCard';
import { FeedSkeleton } from './FeedSkeleton';
import { useFeedStore } from '@/stores/feed-store';

export function FeedList() {
  const {
    notebooks,
    isLoading,
    hasMore,
    error,
    loadFeed,
    loadMore,
  } = useFeedStore();

  const observerTarget = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Initial load
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, []);

  // Load more when intersecting and conditions met
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, isLoading, loadMore]);

  const handleRetry = () => {
    loadFeed();
  };

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load feed: {error}</span>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-10">
      <header className="mb-10 space-y-2 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Feed</h1>
        <p className="text-muted-foreground leading-relaxed">
          Published insights from people you follow and what&apos;s trending. Open a card to read the
          full render, fork, or join the thread.
        </p>
      </header>

      {/* Empty state */}
      {notebooks.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No insights yet</h2>
          <p className="text-muted-foreground">
            Be the first to publish a data insight!
          </p>
        </div>
      )}

      {/* Feed grid - Instagram style (3 columns on lg, 2 on md, 1 on sm) */}
      <div
        role="feed"
        aria-label="Insight feed"
        className="flex flex-col gap-8"
      >
        {notebooks.map((notebook: any) => (
          <FeedCard key={notebook.id} notebook={notebook} />
        ))}
      </div>

      {/* Loading skeleton for initial load */}
      {isLoading && notebooks.length === 0 && <FeedSkeleton count={6} />}

      {/* Loading spinner for loading more */}
      {isLoading && notebooks.length > 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Intersection Observer target at bottom */}
      <div ref={observerTarget} className="h-4" />

      {/* End of feed indicator */}
      {!hasMore && notebooks.length > 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>You've seen all insights</p>
        </div>
      )}
    </div>
  );
}
