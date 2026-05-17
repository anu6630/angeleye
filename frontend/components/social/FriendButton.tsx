'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { savePendingAction } from '@/lib/pending-auth-action';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FriendButtonProps {
  targetUserId: number;
  targetUsername: string;
}

export function FriendButton({ targetUserId, targetUsername }: FriendButtonProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [status, setStatus] = useState<string>('loading');
  const [incomingRequestId, setIncomingRequestId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setStatus('guest');
      return;
    }
    if (user.id === targetUserId) {
      setStatus('self');
      return;
    }
    setStatus('loading');
    try {
      const r = await apiClient.getFriendRelationship(targetUserId);
      setStatus(r.status);
      setIncomingRequestId(r.incoming_request_id ?? null);
    } catch {
      setStatus('none');
    }
  }, [isAuthenticated, user, targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') {
    return (
      <Button variant="outline" size="sm" disabled className="rounded-full gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        …
      </Button>
    );
  }

  if (status === 'guest') {
    return (
      <Button
        variant="default"
        size="sm"
        className="rounded-full"
        onClick={() => {
          const returnPath = `/profile/${encodeURIComponent(targetUsername)}`;
          savePendingAction({
            type: 'friend',
            targetUserId,
            returnPath,
          });
          router.push(`/login?next=${encodeURIComponent(returnPath)}`);
        }}
      >
        Sign in to connect
      </Button>
    );
  }

  if (status === 'self') {
    return null;
  }

  if (status === 'friends') {
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="rounded-full" disabled>
          Friends
        </Button>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/messages">Message</Link>
        </Button>
      </div>
    );
  }

  if (status === 'pending_out') {
    return (
      <Button variant="outline" size="sm" className="rounded-full" disabled>
        Request pending
      </Button>
    );
  }

  if (status === 'pending_in' && incomingRequestId) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="rounded-full"
          onClick={async () => {
            await apiClient.acceptFriendRequest(incomingRequestId);
            await load();
          }}
        >
          Accept friend
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={async () => {
            await apiClient.rejectFriendRequest(incomingRequestId);
            await load();
          }}
        >
          Decline
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      className="rounded-full"
      onClick={async () => {
        try {
          await apiClient.sendFriendRequest(targetUserId);
          await load();
        } catch (e) {
          console.error(e);
        }
      }}
    >
      Add friend
    </Button>
  );
}
