'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FeedCard } from '@/components/feed/FeedCard';
import { apiClient, NotebookCard } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useSocialStore } from '@/stores/social-store';

export default function SavedPage() {
  const router = useRouter();
  const { isAuthenticated, fetchUser } = useAuthStore();
  const hydrateSavedFromFeed = useSocialStore((s) => s.hydrateSavedFromFeed);

  const [notebooks, setNotebooks] = useState<NotebookCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(
    async (nextCursor: string | null | undefined, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setIsLoading(true);
        setError(null);
        const res = await apiClient.getSavedNotebooks(nextCursor ?? undefined);
        hydrateSavedFromFeed(res.items);
        setNotebooks((prev) => (append ? [...prev, ...res.items] : res.items));
        setCursor(res.next_cursor);
        setHasMore(res.has_more);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load saved notebooks');
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [hydrateSavedFromFeed]
  );

  useEffect(() => {
    if (!mounted) return;

    if (!isAuthenticated) {
      fetchUser().catch(() => {
        router.push('/login');
      });
      return;
    }

    void load(null, false);
  }, [isAuthenticated, mounted, router, fetchUser, load]);

  const handleSavedChange = useCallback((notebookId: number, saved: boolean) => {
    if (!saved) {
      setNotebooks((prev) => prev.filter((n) => n.id !== notebookId));
    }
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void load(null, false)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 md:py-10">
        <header className="mb-10 space-y-2 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Saved</h1>
          <p className="text-muted-foreground leading-relaxed">
            Notebooks you saved from the feed. Remove items from the card menu anytime.
          </p>
        </header>

        {notebooks.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nothing saved yet. Save posts from the feed to see them here.</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/feed">Go to feed</Link>
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-8" role="feed" aria-label="Saved notebooks">
          {notebooks.map((nb) => (
            <FeedCard key={nb.id} notebook={nb} onSavedChange={handleSavedChange} />
          ))}
        </div>

        {isLoading && notebooks.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasMore && notebooks.length > 0 && (
          <div className="flex justify-center pt-6">
            <Button
              variant="outline"
              disabled={loadingMore}
              onClick={() => void load(cursor, true)}
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
