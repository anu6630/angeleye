import { BookOpen, Heart, Bookmark, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProfileStatsProps {
  publishedNotebookCount: number;
  likesReceivedCount: number;
  savedNotebookCount: number;
  groupCount: number;
}

export function ProfileStats({ 
  publishedNotebookCount, 
  likesReceivedCount,
  savedNotebookCount,
  groupCount
}: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="border-none bg-muted/20 shadow-none">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <BookOpen className="w-5 h-5 text-primary mb-2" />
          <p className="text-xl font-bold">{publishedNotebookCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Notebooks</p>
        </CardContent>
      </Card>
      
      <Card className="border-none bg-muted/20 shadow-none">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <Heart className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-xl font-bold">{likesReceivedCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Likes</p>
        </CardContent>
      </Card>

      <Card className="border-none bg-muted/20 shadow-none">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <Bookmark className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-xl font-bold">{savedNotebookCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saved</p>
        </CardContent>
      </Card>

      <Card className="border-none bg-muted/20 shadow-none">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <Users className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-xl font-bold">{groupCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Groups</p>
        </CardContent>
      </Card>
    </div>
  );
}
