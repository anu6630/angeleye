'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
import { UnifiedSearchResult } from '@/components/search/UnifiedSearchResult';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { apiClient, UnifiedSearchResult as UnifiedSearchResultType, NotebookResponse } from '@/lib/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Compass, Users, User, Search, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/utils';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';
  const initialTab = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [hits, setHits] = useState<UnifiedSearchResultType[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [emptyState, setEmptyState] = useState<{ message: string; showTrending: boolean } | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'all' && !query) {
          // Special case: Trending on front page
          const res = await apiClient.searchNotebooks('', 'all', 12);
          setHits(res.notebooks.map(nb => ({ type: 'notebook', data: nb })));
          setTotal(res.total);
          setEmptyState(null);
          return;
        }

        if (activeTab === 'notebooks') {
          const response = await apiClient.searchNotebooks(query, 'all', 30);
          setHits(response.notebooks.map(nb => ({ type: 'notebook', data: nb })));
          setTotal(response.total);
          setEmptyState(response.empty_state ? { message: response.message || 'No notebooks found', showTrending: true } : null);
        } else if (activeTab === 'all') {
          const response = await apiClient.globalSearch(query, 30);
          setHits(response.hits);
          setTotal(response.total);
          setEmptyState(response.hits.length === 0 ? { message: 'No results found', showTrending: true } : null);
        } else {
          // Filtered search for users or groups
          const response = await apiClient.globalSearch(query, 30);
          const type = activeTab === 'users' ? 'user' : 'group';
          const filtered = response.hits.filter(h => h.type === type);
          setHits(filtered);
          setTotal(filtered.length);
          
          if (filtered.length === 0) {
            setEmptyState({ 
              message: query ? `No ${activeTab} matching "${query}"` : `Search to find ${activeTab}`, 
              showTrending: false 
            });
          } else {
            setEmptyState(null);
          }
        }
      } catch (error) {
        console.error('Search failed:', error);
        setHits([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [query, activeTab]);

  const updateUrl = (q: string, type: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type !== 'all') params.set('type', type);
    router.replace(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background/50">
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <div className="mb-16 text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tighter text-foreground flex items-center justify-center gap-4">
            <Logo className="h-12 w-12 text-primary" />
            <span>
              Discover Pulze<span className="text-primary">.</span>
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Search for computational notebooks, talented creators, and passionate communities.
          </p>
        </div>

        {/* Search Bar with Glassmorphism */}
        <div className="sticky top-20 z-40 mb-10 p-2 rounded-3xl bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5">
          <SearchBar
            onSearch={(q) => {
              setQuery(q);
              updateUrl(q, activeTab);
            }}
            placeholder="What are you looking for today?"
            defaultValue={queryParam}
          />
        </div>

        {/* Improved Tabs */}
        <div className="flex justify-center mb-8">
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v);
            updateUrl(query, v);
          }} className="w-full max-w-2xl">
            <TabsList className="grid grid-cols-4 w-full h-12 bg-muted/50 backdrop-blur-sm rounded-2xl p-1 border border-border/30">
              <TabsTrigger value="all" className="rounded-xl gap-2 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                All
              </TabsTrigger>
              <TabsTrigger value="notebooks" className="rounded-xl gap-2 text-xs font-bold uppercase tracking-wider">
                <Compass className="h-3.5 w-3.5" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl gap-2 text-xs font-bold uppercase tracking-wider">
                <User className="h-3.5 w-3.5" />
                People
              </TabsTrigger>
              <TabsTrigger value="groups" className="rounded-xl gap-2 text-xs font-bold uppercase tracking-wider">
                <Users className="h-3.5 w-3.5" />
                Groups
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Results Sections */}
        {isLoading ? (
          <FeedSkeleton count={6} />
        ) : (
          <div className="space-y-12">
            {hits.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hits.map((hit, i) => (
                  <div 
                    key={`${hit.type}-${hit.data.id}-${i}`}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <UnifiedSearchResult result={hit} />
                  </div>
                ))}
              </div>
            ) : (
              emptyState && (
                <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50 backdrop-blur-sm">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{emptyState.message}</h3>
                  <p className="text-muted-foreground">Try adjusting your keywords or filters.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Results count footer */}
        {!isLoading && total > 0 && (
          <div className="mt-16 flex items-center justify-center gap-4 py-8 border-t border-border/30">
            <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full border border-border/50 backdrop-blur-sm">
              Found {total} results
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-12">Loading exploration...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
