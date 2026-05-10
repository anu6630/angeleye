'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, GroupPublic } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [group, setGroup] = useState<GroupPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'invite_only'>('open');
  const [saving, setSaving] = useState(false);
  const [promoteUser, setPromoteUser] = useState('');
  const [promoteBusy, setPromoteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const g = await apiClient.getGroup(slug);
      if (!g.is_admin) {
        setError('Only admins can manage this group');
        setGroup(null);
        return;
      }
      setGroup(g);
      setName(g.name);
      setDescription(g.description || '');
      setVisibility(g.visibility as 'public' | 'private');
      setJoinPolicy(g.join_policy as 'open' | 'invite_only');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => router.push('/login'));
      return;
    }
    void load();
  }, [isAuthenticated, fetchUser, router, load]);

  const save = async () => {
    if (!group) return;
    setSaving(true);
    setMsg(null);
    try {
      const g = await apiClient.updateGroup(slug, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        join_policy: joinPolicy,
      });
      setGroup(g);
      setMsg('Saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const uploadIcon = async (f: File | null) => {
    if (!f) return;
    setMsg(null);
    try {
      await apiClient.uploadGroupIcon(slug, f);
      await load();
      setMsg('Icon updated');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const uploadBanner = async (f: File | null) => {
    if (!f) return;
    setMsg(null);
    try {
      await apiClient.uploadGroupBanner(slug, f);
      await load();
      setMsg('Banner updated');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const proposeAdmin = async () => {
    const u = promoteUser.trim().replace(/^@/, '');
    if (!u) return;
    setPromoteBusy(true);
    setMsg(null);
    try {
      const profile = await apiClient.getPublicProfile(u);
      await apiClient.createGroupAdminRequest(slug, profile.user_id);
      setPromoteUser('');
      setMsg(`Admin invitation sent to @${profile.username}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setPromoteBusy(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container max-w-lg py-12 px-4">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Unavailable'}</AlertDescription>
        </Alert>
        <Button variant="link" asChild className="mt-4">
          <Link href={`/groups/${slug}`}>Back to group</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href={`/groups/${slug}`}>← {group.name}</Link>
        </Button>
        <h1 className="font-display text-2xl font-semibold mb-2">Group settings</h1>
        <p className="text-sm text-muted-foreground mb-8">Visibility, joining, and visuals.</p>

        {msg && (
          <Alert className="mb-6">
            <AlertDescription>{msg}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-desc">Description</Label>
            <Input id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Visibility</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              Public
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              Private
            </label>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How people join</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={joinPolicy === 'open'}
                onChange={() => setJoinPolicy('open')}
              />
              Open
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={joinPolicy === 'invite_only'}
                onChange={() => setJoinPolicy('invite_only')}
              />
              Invite only
            </label>
          </fieldset>

          <div className="space-y-2">
            <Label>Icon</Label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-sm"
              onChange={(e) => void uploadIcon(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Banner</Label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-sm"
              onChange={(e) => void uploadBanner(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button className="rounded-full w-full" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>

          <section className="rounded-xl border border-border/80 p-4 space-y-3">
            <h2 className="text-sm font-semibold">Add an admin</h2>
            <p className="text-xs text-muted-foreground">
              They must already be a member. They will accept under Admin requests on their Groups page.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="member username"
                value={promoteUser}
                onChange={(e) => setPromoteUser(e.target.value)}
              />
              <Button type="button" disabled={promoteBusy} onClick={() => void proposeAdmin()}>
                {promoteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send request'}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
