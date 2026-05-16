'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User, FileText, X, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ProfileMediaEditor } from './ProfileMediaEditor';

const profileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
});

type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

interface ProfileEditorProps {
  currentUsername: string;
  currentAvatarUrl?: string | null;
  currentBannerUrl?: string | null;
  currentBio?: string | null;
  onUpdate: (data: ProfileUpdateData) => Promise<void>;
  onCancel: () => void;
  onRefresh: () => void;
}

export function ProfileEditor({
  currentUsername,
  currentAvatarUrl,
  currentBannerUrl,
  currentBio,
  onUpdate,
  onCancel,
  onRefresh
}: ProfileEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileUpdateData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: currentUsername,
      bio: currentBio || '',
    },
  });

  const onSubmit = async (data: ProfileUpdateData) => {
    setIsLoading(true);
    setError(null);

    try {
      await onUpdate({
        username: data.username || currentUsername,
        bio: data.bio || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Media Editor (Banner & Avatar) */}
      <ProfileMediaEditor 
        username={currentUsername}
        initialAvatar={currentAvatarUrl}
        initialBanner={currentBannerUrl}
        onUpdate={onRefresh}
      />

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Update your public profile details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Username
              </Label>
              <Input
                id="username"
                className="bg-background/50 border-border/50"
                defaultValue={currentUsername}
                {...register('username')}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Bio
              </Label>
              <Textarea
                id="bio"
                className="bg-background/50 border-border/50 min-h-[120px]"
                defaultValue={currentBio || ''}
                {...register('bio')}
                disabled={isLoading}
                placeholder="Tell us about yourself..."
                maxLength={500}
              />
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
