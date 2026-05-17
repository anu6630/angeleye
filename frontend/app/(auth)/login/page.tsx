'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { OAuthButton } from '@/components/auth/OAuthButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function parseApiError(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    return first?.msg || 'Request failed';
  }
  return 'Authentication failed';
}

export default function LoginPage() {
  const { 
    loginWithGoogle, 
    loginWithFacebook, 
    isAuthenticated, 
    fetchUser 
  } = useAuthStore();
  
  const router = useRouter();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/feed');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
      const body = isLogin ? { email, password } : { email, password, username };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await fetchUser();
        router.push('/feed');
      } else {
        const data = await response.json().catch(() => ({}));
        setError(parseApiError(data.detail) || 'Authentication failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-primary/[0.03] px-4 py-16 md:py-24">
      <div className="container mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-12">
        
        {/* Left Column: Branding Tagline (Facebook Style) */}
        <div className="lg:col-span-7 flex flex-col text-center lg:text-left space-y-4 lg:space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <Logo className="h-16 w-16 text-primary drop-shadow-md animate-pulse" />
            <span className="font-display text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
              Pulze
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-foreground">
            Connect and share code with developers worldwide.
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 font-medium">
            Pulze helps you build, fork, and remix interactive Python computational notebooks in your social feed.
          </p>
        </div>

        {/* Right Column: Card Form Container */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <Card className="border-border/60 shadow-2xl bg-card/60 backdrop-blur-md overflow-hidden rounded-2xl">
            <CardContent className="p-6 sm:p-8 space-y-5">
              
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Dynamically shown inputs based on registration state */}
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your_handle"
                      autoComplete="username"
                      className="h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    className="h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                      Password
                    </Label>
                    {isLogin && (
                      <Link href="#" className="text-xs text-primary font-semibold hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    minLength={8}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="h-11 rounded-xl bg-background/50 border-border/80 focus-visible:ring-primary/25"
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl py-2 px-3">
                    <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl font-bold text-sm tracking-wide bg-primary hover:bg-primary/95 shadow-md hover:shadow-lg transition-all"
                >
                  {isLoading ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up'}
                </Button>
              </form>

              {/* Separator line */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border/60"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
                  or
                </span>
                <div className="flex-grow border-t border-border/60"></div>
              </div>

              {/* Dynamic Bottom Button for Account Toggle */}
              <div className="flex flex-col items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="w-auto px-6 h-11 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-600/90 text-white hover:text-white border-none shadow-md hover:shadow-lg transition-all"
                >
                  {isLogin ? 'Create New Account' : 'Back to Login'}
                </Button>

                {/* Optional modern SSO login buttons */}
                <div className="w-full pt-2 flex flex-col gap-2.5">
                  <p className="text-[10px] text-center font-bold tracking-widest uppercase text-muted-foreground/50">
                    Connect instantly with
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <OAuthButton
                      provider="google"
                      onClick={() => {
                        setIsGoogleLoading(true);
                        loginWithGoogle();
                      }}
                      isLoading={isGoogleLoading}
                      className="h-10 rounded-xl font-bold text-xs bg-background/50 hover:bg-muted border border-border/80 shadow-sm"
                    />
                    <OAuthButton
                      provider="facebook"
                      onClick={() => {
                        setIsFacebookLoading(true);
                        loginWithFacebook();
                      }}
                      isLoading={isFacebookLoading}
                      className="h-10 rounded-xl font-bold text-xs bg-background/50 hover:bg-muted border border-border/80 shadow-sm"
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
          
          <p className="text-center text-xs text-muted-foreground mt-6 font-medium">
            New here?{' '}
            <Link href="/" className="font-semibold text-primary hover:underline">
              Start on the home page
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
