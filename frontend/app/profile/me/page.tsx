'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { FeedCard } from '@/components/feed/FeedCard';
import { AvatarCropData, User } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, AlertCircle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyProfilePage() {
  const router = useRouter();
  const { isAuthenticated, fetchUser, logout } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [isAuthenticated, router]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profileData = await apiClient.getProfile();
      setUser(profileData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        // Not authenticated, logout and redirect
        await logout();
        router.push('/login');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (data: any) => {
    try {
      await apiClient.updateProfile(data);
      await loadProfile();
      setIsEditing(false);
    } catch (err) {
      throw err;
    }
  };

  const handleUploadAvatar = async (payload: { file: File; cropData: AvatarCropData }) => {
    await apiClient.uploadMyAvatar(payload.file, payload.cropData);
    await loadProfile();
    await fetchUser();
  };

  const handleDeleteAvatar = async () => {
    await apiClient.deleteMyAvatar();
    await loadProfile();
    await fetchUser();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load profile'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 space-y-6">
        {/* Header with edit button */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Profile</h1>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Profile display or editor */}
        {isEditing ? (
          <ProfileEditor
            currentUsername={user.username}
            currentAvatarUrl={user.avatar_url}
            currentBannerUrl={user.banner_url}
            currentBio={user.bio}
            onUpdate={handleUpdateProfile}
            onCancel={() => setIsEditing(false)}
            onRefresh={loadProfile}
          />
        ) : (
          <>
            <ProfileCard user={user} />
            
            <div className="mt-12 space-y-10">
              <div className="flex items-center gap-4 px-2">
                <h3 className="text-2xl font-bold tracking-tight">Public Posts</h3>
                <div className="h-px flex-1 bg-border/50" />
              </div>

              <ProfileNotebookFeed username={user.username} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileNotebookFeed({ username }: { username: string }) {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = async (isInitial = false) => {
    if (isLoading || (!hasMore && !isInitial)) return;
    setIsLoading(true);
    try {
      const res = await apiClient.getUserPublicNotebooks(username, isInitial ? undefined : cursor || undefined);
      if (isInitial) {
        setNotebooks(res.items);
      } else {
        setNotebooks(prev => [...prev, ...res.items]);
      }
      setCursor(res.next_cursor);
      setHasMore(res.has_more);
    } catch (err) {
      console.error('Failed to load user notebooks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMore(true);
  }, [username]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, cursor]);

  if (notebooks.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border/50">
        <p className="text-muted-foreground text-lg italic">
          You haven't posted anything publicly yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-8">
        {notebooks.map((nb) => (
          <FeedCard key={nb.id} notebook={nb} />
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      )}

      <div ref={observerTarget} className="h-4" />

      {!hasMore && notebooks.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 text-xs font-medium">
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            You've seen all public posts
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        </div>
      )}
    </div>
  );
}
