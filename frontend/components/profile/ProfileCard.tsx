'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { User } from '@/lib/api-client';
import { Calendar, Image as ImageIcon, Camera, Edit2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useProgressStore } from '@/stores/progress-store';
import { useState, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { ImageCropper } from './ImageCropper';
import { Button } from '@/components/ui/button';

interface ProfileCardProps {
  user: User;
}

export function ProfileCard({ user }: ProfileCardProps) {
  const { user: currentUser } = useAuthStore();
  const { startUpload, updateProgress, finishUpload } = useProgressStore();
  const isOwner = currentUser?.id === user.id;
  
  const [cropperConfig, setCropperConfig] = useState<{
    open: boolean;
    image: string;
    aspect: number;
    type: 'avatar' | 'banner';
    file: File | null;
  }>({
    open: false,
    image: '',
    aspect: 1,
    type: 'avatar',
    file: null
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperConfig({
        open: true,
        image: reader.result as string,
        aspect: type === 'avatar' ? 1 : 3 / 1,
        type,
        file
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (cropArea: any) => {
    const { type, file } = cropperConfig;
    if (!file) return;

    startUpload(`Uploading ${type}`);
    try {
      // Simulate progress for smooth UI
      let p = 0;
      const interval = setInterval(() => {
        p += 5;
        if (p > 90) clearInterval(interval);
        updateProgress(p);
      }, 100);

      if (type === 'avatar') {
        await apiClient.uploadMyAvatar(file, {
          crop_x: cropArea.x,
          crop_y: cropArea.y,
          crop_size: cropArea.width
        });
        toast.success('Avatar updated');
      } else {
        await apiClient.uploadMyBanner(file, {
          crop_x: cropArea.x,
          crop_y: cropArea.y,
          crop_width: cropArea.width,
          crop_height: cropArea.height
        });
        toast.success('Cover picture updated');
      }
      
      clearInterval(interval);
      finishUpload();
      window.location.reload(); // Refresh to show new images
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      finishUpload();
    }
  };

  const initials = user.username
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-xl rounded-2xl relative">
      {/* Banner Area */}
      <div className="h-64 w-full bg-muted relative group overflow-hidden">
        {user.banner_url ? (
          <img src={user.banner_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}
        
        {isOwner && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <Button 
              variant="secondary" 
              size="sm" 
              className="rounded-full gap-2 shadow-lg"
              onClick={() => bannerInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Replace Cover
            </Button>
          </div>
        )}
        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
      </div>

      <CardContent className="relative pt-0">
        {/* Avatar positioned over banner */}
        <div className="flex flex-col items-center -mt-20 mb-8">
          <div className="relative group">
            <Avatar className="h-40 w-40 border-8 border-background shadow-2xl ring-1 ring-border/50">
              <AvatarImage src={user.avatar_url || undefined} alt={user.username} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-4xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            
            {isOwner && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full backdrop-blur-[2px]">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="rounded-full h-12 w-12 shadow-lg"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>
          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
          
          <div className="mt-4 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-foreground">@{user.username}</h2>
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground font-medium">
              <Calendar className="h-4 w-4" />
              <span>Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full grid gap-8">
          {user.bio && (
            <div className="bg-muted/30 p-6 rounded-2xl border border-border/50 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-2">
                <Edit2 className="w-3 h-3" />
                About
              </h3>
              <p className="text-foreground leading-relaxed text-lg italic opacity-90">"{user.bio}"</p>
            </div>
          )}

        </div>
      </CardContent>

      <ImageCropper
        open={cropperConfig.open}
        onOpenChange={(open) => setCropperConfig(prev => ({ ...prev, open }))}
        image={cropperConfig.image}
        aspect={cropperConfig.aspect}
        onCropComplete={handleCropComplete}
        title={`Crop your ${cropperConfig.type}`}
      />
    </Card>
  );
}
