'use client';

import Link from 'next/link';
import { Users, User, Bookmark } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { UnifiedSearchResult as UnifiedSearchResultType } from '@/lib/api-client';
import { FeedCard } from '@/components/feed/FeedCard';
import { cn } from '@/lib/utils';

interface UnifiedSearchResultProps {
  result: UnifiedSearchResultType;
}

export function UnifiedSearchResult({ result }: UnifiedSearchResultProps) {
  if (result.type === 'notebook') {
    return <FeedCard notebook={result.data} />;
  }

  if (result.type === 'user') {
    const { username, display_name, avatar_url } = result.data;
    return (
      <Card className="group overflow-hidden border-border/50 bg-card/50 transition-all hover:bg-accent/5 hover:shadow-md backdrop-blur-sm rounded-2xl">
        <Link href={`/profile/${username}`} className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
            <AvatarImage src={avatar_url || undefined} alt={username} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {display_name || username}
            </span>
            <span className="text-xs text-muted-foreground">@{username}</span>
          </div>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
        </Link>
      </Card>
    );
  }

  if (result.type === 'group') {
    const { name, slug, description, icon_url } = result.data;
    return (
      <Card className="group overflow-hidden border-border/50 bg-card/50 transition-all hover:bg-accent/5 hover:shadow-md backdrop-blur-sm rounded-2xl">
        <Link href={`/groups/${slug}`} className="flex items-center gap-4 p-4">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
            {icon_url ? (
              <img src={icon_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <Users className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {name}
            </span>
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {description || 'Community of enthusiasts'}
            </span>
          </div>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Bookmark className="h-4 w-4" />
          </div>
        </Link>
      </Card>
    );
  }

  return null;
}
