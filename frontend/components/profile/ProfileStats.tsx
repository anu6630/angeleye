import { BookOpen, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileStatsProps {
  publishedNotebookCount: number;
  likesReceivedCount: number;
}

export function ProfileStats({ publishedNotebookCount, likesReceivedCount }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{publishedNotebookCount}</p>
              <p className="text-sm text-muted-foreground">Notebooks</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{likesReceivedCount}</p>
              <p className="text-sm text-muted-foreground">Likes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
