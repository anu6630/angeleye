'use client';

import { useMemo, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Camera, Loader2, Trash2, Upload } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const ACCEPTED_AVATAR_TYPES = 'image/png,image/jpeg,image/webp';
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

export type AvatarCropPayload = {
  file: File;
  crop: Area;
};

interface AvatarUploaderProps {
  username: string;
  avatarUrl?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  onUpload: (payload: AvatarCropPayload) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export function AvatarUploader({
  username,
  avatarUrl,
  disabled = false,
  uploading = false,
  onUpload,
  onRemove,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const initials = useMemo(
    () =>
      username
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U',
    [username]
  );

  const resetCropState = () => {
    if (sourceImage) {
      URL.revokeObjectURL(sourceImage);
    }
    setSourceImage(null);
    setSourceFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Use PNG, JPEG, or WEBP.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Image exceeds 10 MB limit.');
      return;
    }
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceImage(objectUrl);
    setCropOpen(true);
  };

  const submitCrop = async () => {
    if (!sourceFile || !croppedAreaPixels) {
      setError('Select and crop an image before saving.');
      return;
    }
    setError(null);
    try {
      await onUpload({ file: sourceFile, crop: croppedAreaPixels });
      setCropOpen(false);
      resetCropState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar');
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setError(null);
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove avatar');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20 ring-2 ring-border">
          <AvatarImage src={avatarUrl || undefined} alt={username} />
          <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload photo
          </Button>
          {avatarUrl && onRemove && (
            <Button type="button" variant="ghost" disabled={disabled || uploading} onClick={handleRemove}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPEG, or WEBP. We will crop this into a square avatar.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={cropOpen} onOpenChange={(open) => (!open ? (setCropOpen(false), resetCropState()) : setCropOpen(true))}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Crop profile photo
            </DialogTitle>
            <DialogDescription>Drag to position your photo, then save.</DialogDescription>
          </DialogHeader>
          <div className="relative h-72 w-full overflow-hidden rounded-md bg-black">
            {sourceImage && (
              <Cropper
                image={sourceImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="avatar-zoom">
              Zoom
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => (setCropOpen(false), resetCropState())}>
              Cancel
            </Button>
            <Button type="button" onClick={submitCrop} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
