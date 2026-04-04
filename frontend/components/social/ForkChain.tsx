'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitBranch, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ForkChainProps {
  notebookId: number;
  variant?: 'full' | 'compact';
  className?: string;
}

export function ForkChain({ notebookId, variant = 'full', className }: ForkChainProps) {
  const [chain, setChain] = useState<NotebookResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadChain = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.getForkChain(notebookId);
        setChain(data);
      } catch (error) {
        console.error('Failed to load fork chain:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChain();
  }, [notebookId]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <GitBranch className="h-4 w-4" />
        <span>Loading fork chain...</span>
      </div>
    );
  }

  if (chain.length === 0) {
    return null;
  }

  // Full variant (desktop): Breadcrumb navigation
  if (variant === 'full') {
    // Show first 2 + "..." + last if chain length > 3
    const displayChain = chain.length > 3
      ? [...chain.slice(0, 2), null, ...chain.slice(-1)]
      : chain;

    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-1 flex-wrap">
          {displayChain.map((notebook, index) => {
            if (notebook === null) {
              return (
                <span key="ellipsis" className="text-muted-foreground">
                  ... ({chain.length - 3} more) ...
                </span>
              );
            }

            const isLast = index === displayChain.length - 1;
            return (
              <div key={notebook.id} className="flex items-center gap-1">
                <Link
                  href={`/notebooks/${notebook.id}`}
                  className="hover:underline font-medium"
                >
                  @{notebook.user?.username || 'unknown'}
                </Link>
                {!isLast && <span className="text-muted-foreground">→</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Compact variant (mobile): Badge with expandable chain
  const parent = chain[chain.length - 2]; // Second to last is the direct parent
  const isFork = chain.length > 1;

  if (!isFork) {
    return null; // Not a fork, don't show anything
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <GitBranch className="h-3 w-3" />
        <span>Forked from</span>
        <Link
          href={`/notebooks/${parent.id}`}
          className="hover:underline font-medium"
        >
          @{parent.user?.username || 'unknown'}
        </Link>
        {chain.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Hide chain
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show chain
              </>
            )}
          </Button>
        )}
      </div>

      {isExpanded && chain.length > 2 && (
        <div className="ml-6 flex flex-col gap-1 text-sm">
          {chain.slice(0, -1).reverse().map((notebook, index) => (
            <div key={notebook.id} className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">{chain.length - 1 - index}.</span>
              <Link
                href={`/notebooks/${notebook.id}`}
                className="hover:underline"
              >
                @{notebook.user?.username || 'unknown'}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
