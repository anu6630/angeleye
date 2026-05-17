'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, LayoutDashboard, Users, BookMarked, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const sidebarLinks = [
  { href: '/feed', label: 'Feed', icon: Compass },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/friends', label: 'Friends', icon: UserPlus },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/my-notebooks', label: 'My Notebooks', icon: BookMarked },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card/50 p-2 shadow-sm backdrop-blur-md">
        <div className="mb-2 px-4 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </h2>
        </div>
        <nav className="space-y-1">
          {sidebarLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
            return (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 rounded-xl px-4 py-2.5 transition-all duration-200',
                    active
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'opacity-70')} />
                  <span className="font-medium">{label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}
