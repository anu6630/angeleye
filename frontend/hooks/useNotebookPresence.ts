'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getOrCreateAnonymousViewerId } from '@/lib/viewer-id';
import { useAuthStore } from '@/stores/auth-store';

const DEFAULT_POLL_MS = 12_000;
const DEFAULT_HEARTBEAT_MS = 25_000;

export function useNotebookPresence(
  notebookId: number | undefined,
  options: { enabled: boolean; pollMs?: number; heartbeatMs?: number }
): { onlineViewerCount: number | null } {
  const { enabled, pollMs = DEFAULT_POLL_MS, heartbeatMs = DEFAULT_HEARTBEAT_MS } = options;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [onlineViewerCount, setOnlineViewerCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || notebookId == null) {
      setOnlineViewerCount(null);
      return;
    }

    let cancelled = false;

    const refreshCount = async () => {
      try {
        const p = await apiClient.getNotebookPresence(notebookId);
        if (!cancelled) setOnlineViewerCount(p.online_viewer_count);
      } catch {
        if (!cancelled) setOnlineViewerCount((prev) => prev);
      }
    };

    const sendHeartbeat = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        if (isAuthenticated) {
          await apiClient.postNotebookPresenceHeartbeat(notebookId);
        } else {
          const anon = getOrCreateAnonymousViewerId();
          await apiClient.postNotebookPresenceHeartbeat(notebookId, {
            anonymous_id: anon,
          });
        }
      } catch {
        // ignore
      }
    };

    void refreshCount();
    const pollId = window.setInterval(() => void refreshCount(), pollMs);

    void sendHeartbeat();
    const beatId = window.setInterval(() => void sendHeartbeat(), heartbeatMs);

    const onVis = () => {
      void refreshCount();
      void sendHeartbeat();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearInterval(beatId);
      document.removeEventListener('visibilitychange', onVis);

      const cleanup = async () => {
        try {
          if (isAuthenticated) {
            await apiClient.deleteNotebookPresence(notebookId);
          } else {
            const anon = getOrCreateAnonymousViewerId();
            if (anon) await apiClient.deleteNotebookPresence(notebookId, anon);
          }
        } catch {
          // ignore
        }
      };
      void cleanup();
    };
  }, [enabled, notebookId, isAuthenticated, pollMs, heartbeatMs]);

  return { onlineViewerCount };
}
