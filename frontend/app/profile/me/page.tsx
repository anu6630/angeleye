'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { User } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, AlertCircle, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyProfilePage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, fetchUser, logout } = useAuthStore();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<{ published_notebook_count: number; likes_received_count: number } | null>(null);
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
      const [profileData, statsData] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getProfileStats(),
      ]);

      setUser(profileData);
      setStats(statsData);
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
            currentBio={user.bio}
            onUpdate={handleUpdateProfile}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <ProfileCard
            user={user}
            showStats={true}
            stats={stats || { published_notebook_count: 0, likes_received_count: 0 }}
          />
        )}
      </div>
    </div>
  );
}
