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
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadNotebooks();
  }, [isAuthenticated, router]);

  const loadNotebooks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getUserNotebooks();
      setNotebooks(data);
    } catch (err: any) {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">My Notebooks</h1>
          <Link href="/notebooks/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Notebook
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
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
              <h2 className="text-xl font-semibold mb-2">No notebooks yet</h2>
              <p className="text-muted-foreground mb-4">
                Create your first notebook to get started!
              </p>
              <Link href="/notebooks/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Notebook
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
