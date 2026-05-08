'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AvatarUploader } from './AvatarUploader';
import { AvatarCropData } from '@/lib/api-client';

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileWizardProps {
  onComplete: (
    username: string,
    bio?: string,
    avatarPayload?: { file: File; cropData: AvatarCropData }
  ) => Promise<void>;
}

export function ProfileWizard({ onComplete }: ProfileWizardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPayload, setAvatarPayload] = useState<{ file: File; cropData: AvatarCropData } | undefined>(undefined);

  const {
    register,
    handleSubmit,
    watch,
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
        data.bio || undefined,
        avatarPayload
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

          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Profile photo <span className="text-muted-foreground">(optional)</span>
            </Label>
            <AvatarUploader
              username={watch('username') || 'User'}
              avatarUrl={avatarUrl}
              disabled={isLoading}
              uploading={isLoading}
              onUpload={async ({ file, crop }) => {
                const cropData: AvatarCropData = {
                  crop_x: Math.round(crop.x),
                  crop_y: Math.round(crop.y),
                  crop_size: Math.round(Math.min(crop.width, crop.height)),
                };
                setAvatarPayload({ file, cropData });
                setAvatarUrl(URL.createObjectURL(file));
              }}
            />
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
