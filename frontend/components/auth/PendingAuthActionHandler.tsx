'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import {
  clearPendingAction,
  executePendingAction,
  getPendingAction,
} from '@/lib/pending-auth-action';

export function PendingAuthActionHandler() {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const inFlightRef = useRef(false);

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    if (!isAuthenticated || inFlightRef.current) return;

    const action = getPendingAction();
    if (!action) return;

    // Ensure we are back at original page before execution.
    if (pathname !== action.returnPath) {
      router.replace(action.returnPath);
      return;
    }

    inFlightRef.current = true;

    (async () => {
      try {
        const result = await executePendingAction(action);
        clearPendingAction();

        // For fork, send user to the newly created notebook editor.
        if (action.type === 'fork' && result?.id) {
          router.push(`/notebooks/${result.id}/edit`);
        }
      } catch (error) {
        // If pending action fails (already followed, etc.) drop it to avoid loops.
        clearPendingAction();
        console.error('Failed to execute pending action:', error);
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [isAuthenticated, pathname, router]);

  return null;
}
