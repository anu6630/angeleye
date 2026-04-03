import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { User } from '@/lib/api-client';
import { ProfileStats } from './ProfileStats';

interface ProfileCardProps {
  user: User;
  showStats?: boolean;
  stats?: {
    published_notebook_count: number;
    likes_received_count: number;
  };
}

export function ProfileCard({ user, showStats = true, stats }: ProfileCardProps) {
  const initials = user.username
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{user.username}</h2>
          <p className="text-sm text-muted-foreground">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {user.bio && (
          <div>
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-muted-foreground">{user.bio}</p>
          </div>
        )}
        {showStats && stats && (
          <ProfileStats
            publishedNotebookCount={stats.published_notebook_count}
            likesReceivedCount={stats.likes_received_count}
          />
        )}
      </CardContent>
    </Card>
  );
}
