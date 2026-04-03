import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User, Heart, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotebookOutputViewer } from '@/components/notebook/NotebookOutputViewer';
import { CommentList } from '@/components/social/CommentList';
import { apiClient } from '@/lib/api-client';

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const notebook = await apiClient.getNotebook(parseInt(params.id));

    return {
      title: `${notebook.title} - NotebookSocial`,
      description: notebook.description || 'View this notebook on NotebookSocial',
    };
  } catch {
    return {
      title: 'Notebook not found - NotebookSocial',
    };
  }
}

export default async function NotebookDetailPage({ params }: PageProps) {
  const notebookId = parseInt(params.id);

  let notebook;
  try {
    notebook = await apiClient.getNotebook(notebookId);
  } catch (error) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/feed">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Notebook header */}
        <Card className="mb-6">
          <CardHeader>
            <h1 className="text-3xl font-bold mb-4">{notebook.title}</h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  {notebook.user?.avatar_url ? (
                    <AvatarImage src={notebook.user.avatar_url} alt={notebook.user.username} />
                  ) : (
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {notebook.user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span>{notebook.user?.username || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(notebook.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Button variant="outline" size="sm" disabled>
              <Heart className="h-4 w-4 mr-2" />
              {notebook.like_count || 0}
            </Button>
            <Button variant="outline" size="sm" disabled>
              <MessageCircle className="h-4 w-4 mr-2" />
              {notebook.comment_count || 0}
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Share2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Notebook output - pre-rendered (VIEW-05) */}
        {notebook.output_url ? (
          <NotebookOutputViewer
            outputUrl={notebook.output_url}
            notebookId={notebook.id}
            className="w-full min-h-[600px]"
          />
        ) : (
          <div className="text-center py-12 bg-muted rounded-lg">
            <p className="text-muted-foreground">
              This notebook has not been compiled yet.
            </p>
          </div>
        )}

        {/* Comments section */}
        <CommentList notebookId={notebookId} commentCount={notebook.comment_count || 0} />
      </div>
    </div>
  );
}
