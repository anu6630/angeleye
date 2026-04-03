'use client';

import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';

interface FeedSkeletonProps {
  count?: number;
}

export function FeedSkeleton({ count = 1 }: FeedSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-2" />
            <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
          </CardContent>
          <CardFooter className="flex items-center gap-4 py-3 border-t">
            <div className="h-4 w-8 bg-muted animate-pulse rounded" />
            <div className="h-4 w-8 bg-muted animate-pulse rounded" />
          </CardFooter>
        </Card>
      ))}
    </>
  );
}
