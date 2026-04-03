'use client';

import Link from 'next/link';
import { Heart, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotebookCard } from '@/lib/api-client';

interface FeedCardProps {
  notebook: NotebookCard;
}

export function FeedCard({ notebook }: FeedCardProps) {
  const { id, title, username, avatar_url, like_count, comment_count, created_at } = notebook;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/notebooks/${id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {avatar_url ? (
                <AvatarImage src={avatar_url} alt={username} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {username.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{username}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <h3 className="font-semibold text-lg line-clamp-2">{title}</h3>
        </CardContent>

        <CardFooter className="flex items-center gap-4 py-3 border-t">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Heart className="h-4 w-4" />
            <span>{like_count}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>{comment_count}</span>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
