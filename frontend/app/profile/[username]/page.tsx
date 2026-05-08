'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { User } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<{ published_notebook_count: number; likes_received_count: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch public profile (no auth required per AUTH-04)
        const profileData = await apiClient.getPublicProfile(username);

        setUser({
          id: 0,
          email: '',
          username: profileData.username,
          is_active: true,
          is_verified: true,
          bio: profileData.bio ?? null,
          avatar_url: profileData.avatar_url ?? null,
          created_at: profileData.created_at,
        });
        setStats({
          published_notebook_count: profileData.published_notebook_count,
          likes_received_count: profileData.likes_received_count,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    if (username) {
      loadProfile();
    }
  }, [username]);

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
            {error || 'User not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8">
        <ProfileCard
          user={user}
          showStats={true}
          stats={stats || { published_notebook_count: 0, likes_received_count: 0 }}
        />
      </div>
    </div>
  );
}
