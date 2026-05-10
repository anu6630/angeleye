'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  apiClient,
  GroupAdminPromoPending,
  GroupInvitePending,
  GroupPublic,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Mail, ShieldQuestion, PlusCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GroupsHubPage() {
  const router = useRouter();
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<GroupPublic[]>([]);
  const [invites, setInvites] = useState<GroupInvitePending[]>([]);
  const [promos, setPromos] = useState<GroupAdminPromoPending[]>([]);
  const [discover, setDiscover] = useState<GroupPublic[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hub, pub] = await Promise.all([
        apiClient.getMyGroupsHub(),
        apiClient.listGroups(24, 0),
      ]);
      setMine(hub.groups);
      setInvites(hub.pending_invites);
      setPromos(hub.pending_admin_promotions);
      setDiscover(pub.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      fetchUser().catch(() => router.push('/login'));
      return;
    }
    void load();
  }, [mounted, isAuthenticated, fetchUser, router, load]);

  const onAcceptInvite = async (slug: string, id: number) => {
    await apiClient.acceptGroupInvite(slug, id);
    await load();
  };

  const onRejectInvite = async (slug: string, id: number) => {
    await apiClient.rejectGroupInvite(slug, id);
    await load();
  };

  const onAcceptPromo = async (slug: string, id: number) => {
    await apiClient.acceptGroupAdminRequest(slug, id);
    await load();
  };

  const onRejectPromo = async (slug: string, id: number) => {
    await apiClient.rejectGroupAdminRequest(slug, id);
    await load();
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading groups…
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-10 px-4">
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Groups</h1>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              Your communities, invitations, and admin requests in one place.
            </p>
          </div>
          <Button asChild className="rounded-full shrink-0">
            <Link href="/groups/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New group
            </Link>
          </Button>
        </header>

        {invites.length > 0 && (
          <section className="mb-10 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invitations
            </h2>
            {invites.map((inv) => (
              <Card key={inv.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link href={`/groups/${inv.group.slug}`} className="hover:underline">
                      {inv.group.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    From @{inv.inviter.username} · {inv.group.member_count} members
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void onAcceptInvite(inv.group.slug, inv.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onRejectInvite(inv.group.slug, inv.id)}>
                    Decline
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {promos.length > 0 && (
          <section className="mb-10 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4" />
              Admin requests
            </h2>
            {promos.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link href={`/groups/${p.group.slug}`} className="hover:underline">
                      {p.group.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    @{p.proposer.username} invited you to become an admin
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void onAcceptPromo(p.group.slug, p.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onRejectPromo(p.group.slug, p.id)}>
                    Decline
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="mb-10 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Your groups
          </h2>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              You are not in any group yet. Join a public group or create your own.
            </p>
          ) : (
            <ul className="space-y-2">
              {mine.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/groups/${g.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-border/80 bg-card px-4 py-3 transition hover:bg-muted/40"
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={g.icon_url || undefined} alt="" />
                      <AvatarFallback className="text-xs font-medium">{g.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.member_count} members
                        {g.role === 'admin' ? ' · Admin' : ''}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Discover public</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {discover.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/groups/${g.slug}`}
                  className="flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 transition hover:bg-muted/40"
                >
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{g.member_count} members</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
