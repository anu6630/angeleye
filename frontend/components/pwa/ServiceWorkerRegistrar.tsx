'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/stores/chat-store';

export function ServiceWorkerRegistrar() {
  const setPresenceScope = useChatStore((s) => s.setPresenceScope);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setPresenceScope('in_page_only');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      setPresenceScope('in_page_only');
      return;
    }
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => setPresenceScope('service_worker'))
      .catch(() => setPresenceScope('in_page_only'));
  }, [setPresenceScope]);

  return null;
}
