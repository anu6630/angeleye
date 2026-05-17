'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * When another tab logs in/out, the httpOnly session cookie changes but this tab
 * may still hold the previous user in memory. Refetch /auth/me on focus/visible
 * so the UI and cookie stay aligned (see session-isolation + auth persist).
 */
export function AuthSessionSync() {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        fetchUser().catch(() => {});
      }, 250);
    };

    window.addEventListener('focus', schedule);
    const onVis = () => {
      if (document.visibilityState === 'visible') schedule();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', onVis);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [fetchUser]);

  return null;
}
