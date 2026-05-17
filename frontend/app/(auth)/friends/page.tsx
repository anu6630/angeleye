'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient, type FriendRequestRow, type FriendUserBrief } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Tab = 'friends' | 'incoming' | 'outgoing';

export default function FriendsPage() {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendUserBrief[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [f, inc, out] = await Promise.all([
        apiClient.listFriends(),
        apiClient.listFriendRequests('incoming'),
        apiClient.listFriendRequests('outgoing'),
      ]);
      setFriends(f);
      setIncoming(inc);
      setOutgoing(out);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Sign in to manage friends.</p>
        <Button asChild>
          <Link href="/login?next=/friends">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <h1 className="font-display text-2xl font-semibold mb-4">Friends</h1>
      <div className="flex gap-2 mb-6">
        {(['friends', 'incoming', 'outgoing'] as Tab[]).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'outline'}
            size="sm"
            className="rounded-full capitalize"
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'incoming' && incoming.length > 0 && (
              <span className="ml-1 rounded-full bg-background/20 px-1.5 text-xs">{incoming.length}</span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : tab === 'friends' ? (
        <ul className="space-y-3">
          {friends.map((f) => (
            <li
              key={f.id}
              className={cn('flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3')}
            >
              <Link href={`/profile/${encodeURIComponent(f.username)}`} className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={f.avatar_url || undefined} />
                  <AvatarFallback>{f.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">@{f.username}</span>
              </Link>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link href={`/messages?open=${f.id}`}>Message</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    await apiClient.removeFriend(f.id);
                    await load();
                  }}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
          {friends.length === 0 && (
            <p className="text-sm text-muted-foreground">No friends yet. Send requests from profiles.</p>
          )}
        </ul>
      ) : tab === 'incoming' ? (
        <ul className="space-y-3">
          {incoming.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-border/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={r.user?.avatar_url || undefined} />
                  <AvatarFallback>{r.user?.username?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">@{r.user?.username || `User #${r.requester_id}`}</span>
                  <span className="text-xs text-muted-foreground">Incoming Request</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={async () => {
                    await apiClient.acceptFriendRequest(r.id);
                    await load();
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={async () => {
                    await apiClient.rejectFriendRequest(r.id);
                    await load();
                  }}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
          {incoming.length === 0 && (
            <p className="text-sm text-muted-foreground">No incoming requests.</p>
          )}
        </ul>
      ) : (
        <ul className="space-y-3">
          {outgoing.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-border/80 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={r.user?.avatar_url || undefined} />
                  <AvatarFallback>{r.user?.username?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">@{r.user?.username || `User #${r.addressee_id}`}</span>
                  <span className="text-xs text-muted-foreground">Pending Request</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0"
                onClick={async () => {
                  await apiClient.cancelFriendRequest(r.id);
                  await load();
                }}
              >
                Cancel
              </Button>
            </li>
          ))}
          {outgoing.length === 0 && (
            <p className="text-sm text-muted-foreground">No outgoing requests.</p>
          )}
        </ul>
      )}
    </div>
  );
}
