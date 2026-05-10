'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'group';
}

export default function NewGroupPage() {
  const router = useRouter();
  const { isAuthenticated, fetchUser } = useAuthStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [joinPolicy, setJoinPolicy] = useState<'open' | 'invite_only'>('open');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      fetchUser().catch(() => router.push('/login'));
    }
  }, [isAuthenticated, fetchUser, router]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const g = await apiClient.createGroup({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        visibility,
        join_policy: joinPolicy,
      });
      router.push(`/groups/${g.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-8 md:py-10">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/groups">← Back to groups</Link>
        </Button>
        <h1 className="font-display text-2xl font-semibold tracking-tight mb-2">Create a group</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Name it, pick visibility and how people join. You can change these later in settings.
        </p>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => void submit(e)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="g-name">Name</Label>
            <Input
              id="g-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Data viz club"
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-slug">URL slug</Label>
            <Input
              id="g-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              }}
              placeholder="data-viz-club"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-desc">Description (optional)</Label>
            <Input
              id="g-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short subtitle for the group"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Visibility</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="vis"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
              />
              Public — listed for everyone
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="vis"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
              />
              Private — only members see it
            </label>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">How people join</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="join"
                checked={joinPolicy === 'open'}
                onChange={() => setJoinPolicy('open')}
              />
              Open — anyone who can see the group can join
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="join"
                checked={joinPolicy === 'invite_only'}
                onChange={() => setJoinPolicy('invite_only')}
              />
              Invite only — members must be invited
            </label>
          </fieldset>
          <Button type="submit" className="w-full rounded-full" disabled={submitting || !name.trim()}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              'Create group'
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
