'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Users, Activity } from 'lucide-react';
import { useChatStore } from '@/stores/chat-store';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OnlineFriendsRail() {
  const { isAuthenticated } = useAuthStore();
  const onlineFriends = useChatStore((s) => s.onlineFriends);
  const fetchOnlineFriends = useChatStore((s) => s.fetchOnlineFriends);
  const presenceScope = useChatStore((s) => s.presenceScope);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOnlineFriends().catch(() => {});
    const t = setInterval(() => fetchOnlineFriends().catch(() => {}), 60000);
    return () => clearInterval(t);
  }, [isAuthenticated, fetchOnlineFriends]);

  if (!isAuthenticated) return null;

  return (
    <Card className="border-border/50 bg-card/50 shadow-sm backdrop-blur-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <Users className="h-4 w-4 text-primary" />
            Social
          </CardTitle>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </span>
            {onlineFriends.length} Online
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-tight mt-1">
          {presenceScope === 'in_page_only'
            ? 'Active in this tab'
            : 'Presence active everywhere'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {onlineFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Quiet for now...</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {onlineFriends.map((f) => (
              <li key={f.id}>
                <div className="group flex items-center justify-between gap-2 rounded-xl p-2 transition-colors hover:bg-primary/5">
                  <Link
                    href={`/profile/${encodeURIComponent(f.username)}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-background shadow-sm ring-1 ring-border/50">
                        <AvatarImage src={f.avatar_url || undefined} alt="" />
                        <AvatarFallback className="bg-muted text-xs font-bold">
                          {f.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        @{f.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        Active now
                      </span>
                    </div>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary" 
                    asChild
                  >
                    <Link href={`/messages?open=${f.id}`} aria-label={`Message ${f.username}`}>
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-2">
          <Button variant="outline" size="sm" className="w-full rounded-xl border-border/60 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300" asChild>
            <Link href="/friends">All Friends</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
