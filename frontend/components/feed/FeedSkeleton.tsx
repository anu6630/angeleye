'use client';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface FeedSkeletonProps {
  count?: number;
}

export function FeedSkeleton({ count = 1 }: FeedSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-border/80 bg-card/90">
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-2" />
            <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
          </CardContent>
          <div className="aspect-video w-full bg-muted animate-pulse" />
          <CardFooter className="flex flex-col gap-4 py-4">
            <div className="h-4 w-32 bg-muted animate-pulse rounded self-start ml-1" />
            <div className="h-px w-full bg-border/40" />
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-6">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </>
  );
}
