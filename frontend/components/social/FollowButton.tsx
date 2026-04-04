'use client';

import { useEffect, useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSocialStore } from '@/stores/social-store';
import { apiClient } from '@/lib/api-client';

interface FollowButtonProps {
  userId: number;
  username: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  userId,
  username,
  variant = 'default',
  size = 'sm',
  showText = true,
  onFollowChange,
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const { toggleFollow, isFollowing: checkIsFollowing } = useSocialStore();
  const { toast } = useToast();

  // Initialize follow state from store
  useEffect(() => {
    setIsFollowing(checkIsFollowing(userId));
  }, [userId, checkIsFollowing]);

  const handleToggleFollow = async () => {
    if (isLoading) return;

    const wasFollowing = isFollowing;
    setIsLoading(true);

    try {
      // Optimistic update handled in store
      await toggleFollow(userId);
      setIsFollowing(!wasFollowing);

      toast({
        title: wasFollowing ? 'Unfollowed' : 'Following',
        description: wasFollowing
          ? `You are no longer following @${username}`
          : `You are now following @${username}`,
      });

      // Call callback if provided
      if (onFollowChange) {
        onFollowChange(!wasFollowing);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // State is rolled back in store, just show error
      setIsFollowing(wasFollowing);

      toast({
        variant: 'destructive',
        title: 'Failed to update follow',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-2">{isFollowing ? 'Following' : 'Follow'}</span>
      )}
    </Button>
  );
}
