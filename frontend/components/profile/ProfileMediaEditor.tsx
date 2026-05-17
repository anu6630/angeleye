'use client';

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, Check, X, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { ImageCropper } from './ImageCropper';
import { toast } from 'sonner';
import { Area } from 'react-easy-crop';

interface ProfileMediaEditorProps {
  initialAvatar?: string | null;
  initialBanner?: string | null;
  username: string;
  onUpdate: () => void;
}

export function ProfileMediaEditor({
  initialAvatar,
  initialBanner,
  username,
  onUpdate
}: ProfileMediaEditorProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [bannerUrl, setBannerUrl] = useState(initialBanner);
  const [isUploading, setIsUploading] = useState<'avatar' | 'banner' | null>(null);
  
  // Cropper state
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

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large (max 10MB)');
      return;
    }

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
    
    // Reset input
    e.target.value = '';
  };

  const handleCropComplete = async (cropArea: Area) => {
    const { type, file } = cropperConfig;
    if (!file) return;

    setIsUploading(type);
    try {
      if (type === 'avatar') {
        const res = await apiClient.uploadMyAvatar(file, {
          crop_x: cropArea.x,
          crop_y: cropArea.y,
          crop_size: cropArea.width // width == height for square
        });
        setAvatarUrl(res.avatar_url);
        toast.success('Avatar updated successfully');
      } else {
        const res = await apiClient.uploadMyBanner(file, {
          crop_x: cropArea.x,
          crop_y: cropArea.y,
          crop_width: cropArea.width,
          crop_height: cropArea.height
        });
        setBannerUrl(res.banner_url);
        toast.success('Cover picture updated successfully');
      }
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || `Failed to upload ${type}`);
    } finally {
      setIsUploading(null);
    }
  };

  const handleDelete = async (type: 'avatar' | 'banner') => {
    setIsUploading(type);
    try {
      if (type === 'avatar') {
        await apiClient.deleteMyAvatar();
        setAvatarUrl(null);
        toast.success('Avatar removed');
      } else {
        await apiClient.deleteMyBanner();
        setBannerUrl(null);
        toast.success('Cover picture removed');
      }
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || `Failed to remove ${type}`);
    } finally {
      setIsUploading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner Section */}
      <div className="relative group">
        <div className="h-48 w-full rounded-2xl bg-muted overflow-hidden border border-border/50 shadow-inner">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>
        
        {/* Banner Overlay Controls */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px] rounded-2xl">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="secondary" 
              className="gap-2"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploading === 'banner'}
            >
              {isUploading === 'banner' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {bannerUrl ? 'Change Cover' : 'Upload Cover'}
            </Button>
            {bannerUrl && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => handleDelete('banner')}
                disabled={isUploading === 'banner'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <input 
          type="file" 
          ref={bannerInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleFileChange(e, 'banner')} 
        />
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center -mt-20 relative z-10">
        <div className="relative group">
          <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
            <AvatarImage src={avatarUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Avatar Overlay Controls */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
            <div className="flex flex-col gap-2 scale-90">
              <Button 
                size="icon" 
                variant="secondary" 
                className="rounded-full h-10 w-10"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploading === 'avatar'}
              >
                {isUploading === 'avatar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </Button>
              {avatarUrl && (
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="rounded-full h-10 w-10"
                  onClick={() => handleDelete('avatar')}
                  disabled={isUploading === 'avatar'}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <input 
          type="file" 
          ref={avatarInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleFileChange(e, 'avatar')} 
        />
        <div className="mt-4 text-center">
            <h3 className="text-xl font-bold">@{username}</h3>
            <p className="text-sm text-muted-foreground">Manage your profile visibility</p>
        </div>
      </div>

      <ImageCropper
        open={cropperConfig.open}
        onOpenChange={(open) => setCropperConfig(prev => ({ ...prev, open }))}
        image={cropperConfig.image}
        aspect={cropperConfig.aspect}
        onCropComplete={handleCropComplete}
        title={`Crop your ${cropperConfig.type}`}
      />
    </div>
  );
}
