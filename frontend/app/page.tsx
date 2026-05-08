'use client';

import { OAuthButton } from '@/components/auth/OAuthButton';
import EmailPasswordForm from '@/components/auth/EmailPasswordForm';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Code2, GitFork, Layers, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { loginWithGoogle, loginWithFacebook, isAuthenticated, fetchUser } = useAuthStore();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/feed');
    }
  }, [isAuthenticated, router]);

  return (
    <main className="relative min-h-[calc(100vh-3.5rem)]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.12), transparent 45%),
            radial-gradient(circle at 80% 0%, hsl(220 25% 12% / 0.06), transparent 40%)`,
        }}
      />

      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Draft in the browser · Publish from the cloud
            </p>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Notebooks as social posts.
                <span className="block text-muted-foreground">Edit fast with WASM. Ship with Docker.</span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                IdeaLit is a feed for computational work: write Python notebooks in the editor,
                run cells locally for speed, then compile in an isolated container when you are ready
                to publish for everyone.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Code2,
                  title: 'WASM editing',
                  body: 'Try ideas in the browser without waiting on the server.',
                },
                {
                  icon: Layers,
                  title: 'Container compile',
                  body: 'One click sends your notebook to a reproducible build.',
                },
                {
                  icon: GitFork,
                  title: 'Fork & remix',
                  body: 'Every fork is a first-class post in the feed.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-sm"
                >
                  <Icon className="mb-2 h-5 w-5 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/feed">Browse feed</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <div>
            {showEmailForm ? (
              <EmailPasswordForm />
            ) : (
              <Card className="border-border/80 shadow-lg shadow-primary/5">
                <CardHeader className="space-y-1">
                  <CardTitle className="font-display text-2xl">Join or sign in</CardTitle>
                  <CardDescription>
                    OAuth for speed, or email if you prefer a password.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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

                  <div className="relative text-center text-xs text-muted-foreground">
                    <span className="relative z-10 bg-card px-2">or</span>
                    <span className="absolute left-0 right-0 top-1/2 -z-0 h-px bg-border" aria-hidden />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-full"
                    onClick={() => setShowEmailForm(true)}
                  >
                    Continue with email
                  </Button>

                  <p className="text-center text-[11px] text-muted-foreground">
                    By continuing you agree to the terms and privacy policy for this demo environment.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
