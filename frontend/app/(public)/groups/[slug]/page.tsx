'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient, GroupPublic, type FeedResponse } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, PenLine, Settings, Users } from 'lucide-react';

export default function GroupDetailPage() {
  const params = useParams();
  const rawSlug = params.slug;
  const slug =
    typeof rawSlug === 'string'
      ? rawSlug
      : Array.isArray(rawSlug)
        ? rawSlug[0] ?? ''
        : '';

  const { isAuthenticated, fetchUser } = useAuthStore();
  const [group, setGroup] = useState<GroupPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [inviteUser, setInviteUser] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [postsFeed, setPostsFeed] = useState<FeedResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const g = await apiClient.getGroup(slug);
      setGroup(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Group not found');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadPosts = useCallback(async () => {
    if (!slug) {
      setPostsLoading(false);
      return;
    }
    setPostsLoading(true);
    try {
      const f = await apiClient.getGroupPosts(slug, { limit: 30 });
      setPostsFeed(f);
    } catch {
      setPostsFeed(null);
    } finally {
      setPostsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (group) void loadPosts();
  }, [group, loadPosts]);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => {});
    }
  }, [isAuthenticated, fetchUser]);

  useEffect(() => {
    if (!group) return;
    const liveSlug = group.slug;

    const pollMs = 12_000;
    const heartbeatMs = 25_000;

    const refreshCount = async () => {
      // Poll even when the tab is hidden so counts stay accurate and automated tests (headless) still work.
      try {
        const p = await apiClient.getGroupPresence(liveSlug);
        setOnlineCount(p.online_user_count);
      } catch {
        // ignore (e.g. network)
      }
    };

    const sendHeartbeat = async () => {
      if (!isAuthenticated) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        await apiClient.postGroupPresenceHeartbeat(liveSlug);
      } catch {
        // ignore
      }
    };

    void refreshCount();
    const pollId = window.setInterval(() => void refreshCount(), pollMs);

    let beatId: number | undefined;
    if (isAuthenticated) {
      void sendHeartbeat();
      beatId = window.setInterval(() => void sendHeartbeat(), heartbeatMs);
    }

    const onVis = () => {
      void refreshCount();
      void sendHeartbeat();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(pollId);
      if (beatId !== undefined) window.clearInterval(beatId);
      document.removeEventListener('visibilitychange', onVis);
      if (isAuthenticated) {
        void apiClient.deleteGroupPresence(liveSlug).catch(() => {});
      }
    };
  }, [group, isAuthenticated]);

  const join = async () => {
    setActionMsg(null);
    try {
      const g = await apiClient.joinGroup(slug);
      setGroup(g);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Could not join');
    }
  };

  const leave = async () => {
    setActionMsg(null);
    try {
      await apiClient.leaveGroup(slug);
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Could not leave');
    }
  };

  const sendInvite = async () => {
    const u = inviteUser.trim().replace(/^@/, '');
    if (!u) return;
    setInviteBusy(true);
    setActionMsg(null);
    try {
      const profile = await apiClient.getPublicProfile(u);
      await apiClient.createGroupInvite(slug, profile.user_id);
      setInviteUser('');
      setActionMsg(`Invited @${profile.username}`);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setInviteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container max-w-lg py-12 px-4">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Not found'}</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4">
          <Link href="/groups">Back to groups</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div
        className="h-36 w-full bg-muted bg-cover bg-center sm:h-44"
        style={
          group.banner_url
            ? { backgroundImage: `url(${group.banner_url})` }
            : undefined
        }
      />
      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-md sm:h-24 sm:w-24">
              <AvatarImage src={group.icon_url || undefined} alt="" />
              <AvatarFallback className="text-lg font-semibold">{group.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="pb-1 min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight truncate">{group.name}</h1>
              <p className="text-sm text-muted-foreground">
                {group.member_count} members · {group.visibility} ·{' '}
                {group.join_policy === 'open' ? 'Open join' : 'Invite only'}
              </p>
              {onlineCount !== null && (
                <div
                  data-testid="group-online-count"
                  aria-live="polite"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground shadow-sm"
                  title="Signed-in members with this group page open in the last minute"
                >
                  <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/35" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                  </span>
                  <Users className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                  <span className="font-medium tabular-nums text-foreground">
                    {onlineCount} {onlineCount === 1 ? 'person' : 'people'} browsing
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAuthenticated && group.is_admin && (
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link href={`/groups/${slug}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
            {isAuthenticated && group.can_join && (
              <Button size="sm" className="rounded-full" onClick={() => void join()}>
                Join
              </Button>
            )}
            {isAuthenticated && group.is_member && !group.can_join && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => void leave()}>
                Leave
              </Button>
            )}
            {!isAuthenticated && group.visibility === 'public' && group.join_policy === 'open' && (
              <Button size="sm" className="rounded-full" asChild>
                <Link href={`/login?returnUrl=/groups/${slug}`}>Log in to join</Link>
              </Button>
            )}
          </div>
        </div>

        {group.description && (
          <p className="mt-6 text-muted-foreground leading-relaxed">{group.description}</p>
        )}

        <section className="mt-10">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Posts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Notebooks published to this group appear here, not on the main feed.
              </p>
            </div>
            {isAuthenticated && group.is_member ? (
              <Button size="sm" className="shrink-0 rounded-full" asChild>
                <Link href={`/notebooks/new?group=${encodeURIComponent(slug)}`}>
                  <PenLine className="mr-2 h-4 w-4" />
                  Post to this group
                </Link>
              </Button>
            ) : isAuthenticated && (group.can_join || group.visibility === 'public') ? (
              <p className="text-sm text-muted-foreground sm:max-w-xs sm:text-right">
                Join this group to publish notebooks here.
              </p>
            ) : null}
          </div>
          {postsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading posts…
            </div>
          )}
          {!postsLoading && postsFeed && postsFeed.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No notebooks posted to this group yet.</p>
          )}
          {!postsLoading && postsFeed && postsFeed.items.length > 0 && (
            <ul className="space-y-3">
              {postsFeed.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/notebooks/${item.id}`}
                    className="block rounded-xl border border-border/80 bg-card p-4 transition-colors hover:bg-muted/40"
                  >
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      @{item.username}
                      {item.created_at
                        ? ` · ${new Date(item.created_at).toLocaleDateString()}`
                        : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {actionMsg && (
          <Alert className="mt-6">
            <AlertDescription>{actionMsg}</AlertDescription>
          </Alert>
        )}

        {isAuthenticated && group.is_member && (
          <section className="mt-8 rounded-xl border border-border/80 bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Invite someone</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Enter their username (as on their profile). They will see the invite on their Groups page.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="username"
                value={inviteUser}
                onChange={(e) => setInviteUser(e.target.value)}
                className="sm:max-w-xs"
              />
              <Button type="button" disabled={inviteBusy} onClick={() => void sendInvite()}>
                {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invite'}
              </Button>
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Button variant="link" asChild>
            <Link href="/groups">← All groups</Link>
          </Button>
        </p>
      </div>
    </main>
  );
}
