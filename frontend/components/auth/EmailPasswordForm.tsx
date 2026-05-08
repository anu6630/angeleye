'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function parseApiError(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    return first?.msg || 'Request failed';
  }
  return 'Authentication failed';
}

interface EmailPasswordFormProps {
  embedded?: boolean;
}

export default function EmailPasswordForm({ embedded = false }: EmailPasswordFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { fetchUser } = useAuthStore();
  const router = useRouter();

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

  const header =
    embedded ? null : (
      <CardHeader>
        <CardTitle className="font-display text-2xl">
          {isLogin ? 'Sign in' : 'Create account'}
        </CardTitle>
        <CardDescription>
          {isLogin
            ? 'Use the same email you use for collaboration.'
            : 'Pick a username — it shows on your notebooks and profile.'}
        </CardDescription>
      </CardHeader>
    );

  const body = (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              autoComplete="username"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? '••••••••' : 'At least 8 characters'}
            minLength={8}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full rounded-full" disabled={isLoading}>
          {isLoading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {isLogin ? "Need an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <Card className="border-border/80 shadow-lg shadow-primary/5">
      {header}
      <CardContent className="pb-8">{body}</CardContent>
    </Card>
  );
}
