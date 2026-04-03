'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, FileText, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  avatar_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileWizardProps {
  onComplete: (username: string, avatarUrl?: string, bio?: string) => Promise<void>;
}

export function ProfileWizard({ onComplete }: ProfileWizardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await onComplete(
        data.username,
        data.avatar_url || undefined,
        data.bio || undefined
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>
          Set up your username and optional profile information to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Username - Required per D-05 */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              placeholder="Choose a username"
              {...register('username')}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              3-50 characters, letters, numbers, underscores, and hyphens only
            </p>
          </div>

          {/* Avatar URL - Optional per D-06 */}
          <div className="space-y-2">
            <Label htmlFor="avatar_url" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Avatar URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="avatar_url"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              {...register('avatar_url')}
              disabled={isLoading}
            />
            {errors.avatar_url && (
              <p className="text-sm text-destructive">{errors.avatar_url.message}</p>
            )}
          </div>

          {/* Bio - Optional per D-06 */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bio <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
              {...register('bio')}
              disabled={isLoading}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              Max 500 characters
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Complete Profile'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
