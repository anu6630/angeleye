'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GitBranch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { savePendingAction } from '@/lib/pending-auth-action';

interface ForkButtonProps {
  notebookId: number;
  notebookTitle: string;
  onFork?: (notebook: NotebookResponse) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function ForkButton({
  notebookId,
  notebookTitle,
  onFork,
  variant = 'default',
  size = 'sm',
  showText = true,
  className,
}: ForkButtonProps) {
  const [isForking, setIsForking] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  const handleForkClick = () => {
    if (!isAuthenticated) {
      savePendingAction({
        type: 'fork',
        notebookId,
        returnPath: pathname || `/notebooks/${notebookId}`,
      });
      router.push('/login');
      return;
    }
    setShowDialog(true);
  };

  const handleConfirmFork = async () => {
    setIsForking(true);
    setShowDialog(false);

    try {
      const forkedNotebook = await apiClient.forkNotebook(notebookId);

      toast({
        title: 'Notebook forked!',
        description: `You can now edit your copy of "${notebookTitle}"`,
      });

      // Call callback if provided
      if (onFork) {
        onFork(forkedNotebook);
      }

      // Navigate to the forked notebook editor
      router.push(`/notebooks/${forkedNotebook.id}/edit`);
    } catch (error) {
      console.error('Failed to fork notebook:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fork',
        description: error instanceof Error ? error.message : 'Please try again later',
      });
    } finally {
      setIsForking(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleForkClick}
        disabled={isForking}
        className={className}
      >
        {isForking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GitBranch className="h-4 w-4" />
        )}
        {showText && <span className="ml-2">Fork</span>}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fork "{notebookTitle}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy that you can edit. Your fork will appear in the feed alongside the original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFork}>
              Fork Notebook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
