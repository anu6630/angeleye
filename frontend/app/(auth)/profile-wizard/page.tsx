'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileWizard } from '@/components/profile/ProfileWizard';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileWizardPage() {
  const { isAuthenticated, pendingUserId, completeProfile } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Check for pending user from cookie (in real implementation, would need server component to read cookie)
    const getPendingUserId = () => {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'pending_user_id') {
          return value;
        }
      }
      return null;
    };

    const pendingId = getPendingUserId();
    if (pendingId) {
      useAuthStore.getState().setPendingUserId(pendingId);
    }
  }, []);

  useEffect(() => {
    // If already authenticated and no pending user, redirect to home
    if (isAuthenticated && !pendingUserId) {
      router.push('/');
    }
  }, [isAuthenticated, pendingUserId, router]);

  const handleCompleteProfile = async (username: string, avatarUrl?: string, bio?: string) => {
    try {
      await completeProfile(username, avatarUrl, bio);
      router.push('/');
    } catch (error) {
      console.error('Failed to complete profile:', error);
      throw error;
    }
  };

  if (!pendingUserId && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">No pending session found. Please login again.</p>
      </div>
    );
  }

  return <ProfileWizard onComplete={handleCompleteProfile} />;
}
