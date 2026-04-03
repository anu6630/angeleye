'use client';

import { OAuthButton } from '@/components/auth/OAuthButton';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, loginWithFacebook, isAuthenticated, fetchUser } = useAuthStore();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    loginWithGoogle();
  };

  const handleFacebookLogin = () => {
    setIsFacebookLoading(true);
    loginWithFacebook();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to NotebookSocial</h1>
        <p className="text-muted-foreground">
          Sign in to create and share Python notebooks
        </p>
      </div>

      <div className="space-y-4">
        <OAuthButton
          provider="google"
          onClick={handleGoogleLogin}
          isLoading={isGoogleLoading}
        />
        <OAuthButton
          provider="facebook"
          onClick={handleFacebookLogin}
          isLoading={isFacebookLoading}
        />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
