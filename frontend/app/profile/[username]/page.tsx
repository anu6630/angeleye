'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { FeedCard } from '@/components/feed/FeedCard';
import { FriendButton } from '@/components/social/FriendButton';
import { User } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import { Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat-store';

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<User | null>(null);
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
          id: profileData.user_id,
          email: '',
          username: profileData.username,
          is_active: true,
          is_verified: true,
          bio: profileData.bio ?? null,
          avatar_url: profileData.avatar_url ?? null,
          banner_url: profileData.banner_url ?? null,
          created_at: profileData.created_at,
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
        <ProfileCard user={user} />
        
        <div className="mt-8 flex justify-center gap-4">
          <FriendButton targetUserId={user.id} targetUsername={user.username} />
          <Button 
            variant="outline" 
            size="lg" 
            className="rounded-full px-8 gap-2 shadow-lg hover:shadow-primary/10 transition-all border-primary/20"
            onClick={async () => {
              const { conversation_id } = await apiClient.openDirectConversation(user.id);
              useChatStore.getState().openChatWindow(conversation_id, {
                id: user.id,
                username: user.username,
                avatar_url: user.avatar_url ?? undefined
              });
            }}
          >
            <MessageCircle className="h-5 w-5 text-primary" />
            Message
          </Button>
        </div>

        <div className="mt-12 space-y-10">
          <div className="flex items-center gap-4 px-2">
            <h3 className="text-2xl font-bold tracking-tight">Public Posts</h3>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <ProfileNotebookFeed username={username} />
        </div>
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
          @{username} hasn't posted anything publicly yet.
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
