'use client';

import { useProgressStore } from '@/stores/progress-store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function GlobalProgressBar() {
  const { isUploading, progress, label } = useProgressStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isUploading) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isUploading]);

  if (!visible) return null;

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] h-1 bg-background/20 backdrop-blur-sm transition-opacity duration-300",
        isUploading ? "opacity-100" : "opacity-0"
      )}
    >
      <div 
        className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
        style={{ width: `${progress}%` }}
      />
      {label && (
        <div className="absolute top-2 right-4 bg-background/80 backdrop-blur-md border border-border/50 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest text-primary shadow-sm animate-in fade-in slide-in-from-top-1">
          {label}... {Math.round(progress)}%
        </div>
      )}
    </div>
  );
}
