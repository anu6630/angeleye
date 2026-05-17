'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';

export function ChatConnectionManager() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const connect = useChatStore((s) => s.connect);
  const disconnect = useChatStore((s) => s.disconnect);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
      return () => disconnect();
    }
    disconnect();
    return undefined;
  }, [isAuthenticated, connect, disconnect]);

  return null;
}
