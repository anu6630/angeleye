'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterTabs } from '@/components/search/FilterTabs';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { apiClient, NotebookResponse } from '@/lib/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [query, setQuery] = useState(queryParam);
  const [tab, setTab] = useState('all');
  const [results, setResults] = useState<NotebookResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [emptyState, setEmptyState] = useState<{ message: string; showTrending: boolean } | null>(null);

  useEffect(() => {
    const loadSearchResults = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.searchNotebooks(query, tab, 50);
        setResults(response.notebooks);
        setTotal(response.total);

        if (response.empty_state) {
          setEmptyState({
            message: response.message || 'No notebooks found',
            showTrending: response.notebooks.length === 0,
          });
        } else {
          setEmptyState(null);
        }
      } catch (error) {
        console.error('Failed to search notebooks:', error);
        setEmptyState({
          message: 'Failed to search notebooks',
          showTrending: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSearchResults();
  }, [query, tab]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'originals', label: 'Originals' },
    { id: 'forks', label: 'Forks' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header with SearchBar and FilterTabs */}
        <div className="mb-6 space-y-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search notebooks by title, content, or author..."
            defaultValue={queryParam}
          />
          <FilterTabs
            activeTab={tab}
            onTabChange={handleTabChange}
            tabs={tabs}
          />
        </div>

        {/* Loading state */}
        {isLoading && results.length === 0 && <FeedSkeleton count={6} />}

        {/* Empty state */}
        {!isLoading && emptyState && emptyState.showTrending && results.length === 0 && (
          <Alert>
            <AlertDescription>
              <div className="text-center py-8">
                <p className="text-lg font-medium mb-2">{emptyState.message}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Here are some trending notebooks you might like
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && emptyState && !emptyState.showTrending && results.length === 0 && (
          <Alert>
            <AlertDescription>
              <div className="text-center py-8">
                <p className="text-lg font-medium">{emptyState.message}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((notebook) => (
            <FeedCard key={notebook.id} notebook={notebook} />
          ))}
        </div>

        {/* Results count */}
        {!isLoading && results.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Found {total} {total === 1 ? 'notebook' : 'notebooks'}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
