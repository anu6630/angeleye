'use client';

import { OAuthButton } from '@/components/auth/OAuthButton';
import EmailPasswordForm from '@/components/auth/EmailPasswordForm';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/layout/Logo';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const { loginWithGoogle, loginWithFacebook, isAuthenticated, fetchUser } = useAuthStore();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'email'>('oauth');

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/feed');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
      <div className="container mx-auto flex max-w-lg flex-col gap-8 px-4 py-12">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <Logo className="h-12 w-12 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to create notebooks, compile, and publish to the feed.
          </p>
          <p className="text-sm text-muted-foreground">
            New here?{' '}
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Start on the home page
            </Link>
          </p>
        </div>

        <Card className="border-border/80 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-xl">Sign in</CardTitle>
            <CardDescription>Choose OAuth or email — same account either way.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-1 rounded-full bg-muted p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'flex-1 rounded-full',
                  authMethod === 'oauth' && 'bg-background shadow-sm'
                )}
                onClick={() => setAuthMethod('oauth')}
              >
                OAuth
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'flex-1 rounded-full',
                  authMethod === 'email' && 'bg-background shadow-sm'
                )}
                onClick={() => setAuthMethod('email')}
              >
                Email
              </Button>
            </div>

            {authMethod === 'oauth' ? (
              <div className="space-y-3">
                <OAuthButton
                  provider="google"
                  onClick={() => {
                    setIsGoogleLoading(true);
                    loginWithGoogle();
                  }}
                  isLoading={isGoogleLoading}
                />
                <OAuthButton
                  provider="facebook"
                  onClick={() => {
                    setIsFacebookLoading(true);
                    loginWithFacebook();
                  }}
                  isLoading={isFacebookLoading}
                />
              </div>
            ) : (
              <EmailPasswordForm embedded />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
