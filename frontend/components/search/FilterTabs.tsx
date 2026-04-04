'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: FilterTab[];
  className?: string;
}

export function FilterTabs({ activeTab, onTabChange, tabs, className }: FilterTabsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant={activeTab === tab.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onTabChange(tab.id)}
          className="relative"
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-2 text-muted-foreground">
              ({tab.count})
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
