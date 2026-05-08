'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function NotebooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check auth state on mount
    const checkAuth = async () => {
      await fetchUser();
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [fetchUser]);

  useEffect(() => {
    // Redirect to login if not authenticated after checking
    if (!isCheckingAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  // Show loading spinner while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
