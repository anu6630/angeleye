'use client';

import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface NotebookOutputViewerProps {
  outputUrl: string | null;
  notebookId: number;
  className?: string;
}

export function NotebookOutputViewer({
  outputUrl,
  notebookId,
  className = ''
}: NotebookOutputViewerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading (PERF-04)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before visible
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const handleIframeLoad = () => {
    setIsLoaded(true);
  };

  const handleIframeError = () => {
    setError('Failed to load notebook output');
    setIsLoaded(true);
  };

  if (!outputUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <div className="text-center p-8">
          <p className="text-muted-foreground">
            This notebook has not been compiled yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Compile the notebook to see the rendered output.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full min-h-[400px]" />
      )}

      {isInView && (
        <iframe
          ref={iframeRef}
          src={outputUrl}
          className={`w-full h-full border-0 rounded-lg bg-white ${isLoaded ? 'block' : 'absolute inset-0 -z-10'}`}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={`Notebook ${notebookId} output`}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-lg">
          <div className="text-center p-8">
            <p className="text-destructive font-medium">Error loading output</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoaded(false);
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {!isLoaded && isInView && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading notebook output...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Export a simpler version for inline viewing
interface InlineNotebookOutputProps {
  outputUrl: string | null;
  className?: string;
}

export function InlineNotebookOutput({ outputUrl, className = '' }: InlineNotebookOutputProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!outputUrl) return null;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isLoaded && <Skeleton className="absolute inset-0 w-full h-full min-h-[200px]" />}

      {isInView && (
        <iframe
          src={outputUrl}
          className={`w-full h-full border-0 rounded-lg ${isLoaded ? 'block' : 'absolute inset-0 -z-10'}`}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          style={{ minHeight: '200px' }}
        />
      )}
    </div>
  );
}
