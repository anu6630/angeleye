'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User, FileText, Edit2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AvatarUploader } from './AvatarUploader';
import { AvatarCropData } from '@/lib/api-client';

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
  currentBio?: string | null;
  onUpdate: (data: ProfileUpdateData) => Promise<void>;
  onUploadAvatar: (payload: { file: File; cropData: AvatarCropData }) => Promise<void>;
  onDeleteAvatar: () => Promise<void>;
  onCancel: () => void;
}

export function ProfileEditor({
  currentUsername,
  currentAvatarUrl,
  currentBio,
  onUpdate,
  onUploadAvatar,
  onDeleteAvatar,
  onCancel
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 className="w-5 h-5" />
          Edit Profile
        </CardTitle>
        <CardDescription>
          Update your profile information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Username
            </Label>
            <Input
              id="username"
              defaultValue={currentUsername}
              {...register('username')}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Profile photo
            </Label>
            <AvatarUploader
              username={currentUsername}
              avatarUrl={currentAvatarUrl}
              disabled={isLoading}
              uploading={isLoading}
              onUpload={async ({ file, crop }) => {
                const cropData: AvatarCropData = {
                  crop_x: Math.round(crop.x),
                  crop_y: Math.round(crop.y),
                  crop_size: Math.round(Math.min(crop.width, crop.height)),
                };
                setIsLoading(true);
                try {
                  await onUploadAvatar({ file, cropData });
                } finally {
                  setIsLoading(false);
                }
              }}
              onRemove={async () => {
                setIsLoading(true);
                try {
                  await onDeleteAvatar();
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bio
            </Label>
            <Textarea
              id="bio"
              defaultValue={currentBio || ''}
              {...register('bio')}
              disabled={isLoading}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
