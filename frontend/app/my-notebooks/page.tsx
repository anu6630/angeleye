'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, FileText, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export default function MyNotebooksPage() {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    console.log('My Notebooks page mounted, checking auth state...');
    console.log('isAuthenticated:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('Not authenticated, fetching user...');
      fetchUser().catch(err => {
        console.error('Failed to fetch user:', err);
        router.push('/login');
      });
      return;
    }

    loadNotebooks();
  }, [isAuthenticated, mounted, router, fetchUser]);

  const loadNotebooks = async () => {
    console.log('Loading notebooks...');
    console.log('Authentication state:', isAuthenticated);
    console.log('Current cookies:', document.cookie);
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getUserNotebooks();
      const list = data.notebooks ?? [];
      console.log('Notebooks loaded:', list);
      setNotebooks(list);
    } catch (err: any) {
      console.error('Failed to load notebooks:', err);
      console.error('Error stack:', err.stack);
      setError(err.message || 'Failed to load notebooks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await apiClient.deleteNotebook(id);
      setNotebooks((prev) => prev.filter((nb) => nb.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete notebook');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">My insights</h1>
            <p className="mt-1 text-muted-foreground">Drafts and published work in one place.</p>
          </div>
          <Link href="/notebooks/new">
            <Button size="sm" className="rounded-full">
              <Plus className="mr-2 h-4 w-4" />
              New insight
            </Button>
          </Link>
        </div>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={loadNotebooks}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && notebooks.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : notebooks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No insights yet</h2>
              <p className="text-muted-foreground mb-4">
                Create your first data insight to get started!
              </p>
              <Link href="/notebooks/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Insight
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notebooks.map((notebook) => (
              <Card key={notebook.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{notebook.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {notebook.is_published ? (
                            <>
                              <Eye className="h-4 w-4" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <Edit2 className="h-4 w-4" />
                              <span>Draft</span>
                            </>
                          )}
                        </div>
                        <span>{new Date(notebook.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/notebooks/${notebook.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(notebook.id, notebook.title)}
                        disabled={deletingId === notebook.id}
                      >
                        {deletingId === notebook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
