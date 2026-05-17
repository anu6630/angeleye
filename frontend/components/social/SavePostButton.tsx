'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { useSocialStore } from '@/stores/social-store';
import { useAuthStore } from '@/stores/auth-store';
import { savePendingAction } from '@/lib/pending-auth-action';
import { cn } from '@/lib/utils';

interface SavePostButtonProps {
  notebookId: number;
  /** Total saves on this post (from API). Shown next to the button when greater than zero. */
  saveCount?: number;
  showText?: boolean;
  /** Show numeric save_count when &gt; 0 (same idea as likes). */
  showCount?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSavedChange?: (notebookId: number, saved: boolean) => void;
  /** When true, loads saved state from API on mount. Use on notebook detail only; feed hydrates from /feed. */
  fetchInitialSavedState?: boolean;
}

export function SavePostButton({
  notebookId,
  saveCount: propSaveCount,
  showText = true,
  showCount = true,
  variant = 'outline',
  size = 'sm',
  className,
  onSavedChange,
  fetchInitialSavedState = false,
}: SavePostButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    isSaved,
    toggleSave,
    syncSavedFromCheck,
    notebookSaveCounts,
    seedNotebookSaveCount,
    setNotebookSaveCount,
  } = useSocialStore();

  useEffect(() => {
    if (typeof propSaveCount !== 'number') return;
    if (fetchInitialSavedState) {
      setNotebookSaveCount(notebookId, propSaveCount);
    } else {
      seedNotebookSaveCount(notebookId, propSaveCount);
    }
  }, [
    notebookId,
    propSaveCount,
    fetchInitialSavedState,
    seedNotebookSaveCount,
    setNotebookSaveCount,
  ]);

  const storedCount = notebookSaveCounts[notebookId];
  const displayCount =
    storedCount !== undefined ? storedCount : (propSaveCount ?? 0);

  useEffect(() => {
    if (!isAuthenticated || !fetchInitialSavedState) return;
    let cancelled = false;
    apiClient
      .checkNotebookSaved(notebookId)
      .then(({ is_saved }) => {
        if (!cancelled) syncSavedFromCheck(notebookId, is_saved);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, notebookId, syncSavedFromCheck, fetchInitialSavedState]);

  const saved = isAuthenticated ? isSaved(notebookId) : false;

  const handleClick = async () => {
    if (isLoading) return;
    if (!isAuthenticated) {
      savePendingAction({
        type: 'save',
        notebookId,
        returnPath: pathname || `/notebooks/${notebookId}`,
      });
      router.push('/login');
      return;
    }
    const wasSaved = isSaved(notebookId);
    setIsLoading(true);
    try {
      await toggleSave(notebookId);
      onSavedChange?.(notebookId, !wasSaved);
    } catch (e) {
      console.error('Failed to toggle save', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void handleClick()}
      disabled={isLoading}
      className={cn(
        'rounded-full gap-1.5',
        className,
        // Light surface only when saved (avoid primary fill + inherited muted text = poor contrast)
        saved &&
          'border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
      )}
      title={saved ? 'Remove from saved' : 'Save to your list'}
      aria-label={saved ? 'Remove from saved' : 'Save post'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Bookmark className={cn('h-4 w-4 shrink-0', saved && 'fill-current')} aria-hidden />
      )}
      {showText ? <span>{saved ? 'Saved' : 'Save'}</span> : null}
      {showCount && displayCount > 0 && (
        <span className="text-sm font-semibold tabular-nums pr-0.5">{displayCount}</span>
      )}
    </Button>
  );
}
