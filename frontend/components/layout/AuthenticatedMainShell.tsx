'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { OnlineFriendsRail } from '@/components/social/OnlineFriendsRail';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';

export function AuthenticatedMainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  const fullBleed =
    pathname === '/' ||
    pathname === '/login' ||
    pathname?.startsWith('/register') ||
    false;

  if (!isAuthenticated || fullBleed) {
    return <>{children}</>;
  }

  return (
    <div className="container mx-auto max-w-[1800px] px-6 pb-10 pt-6 md:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr_320px] lg:items-start">
        {/* Left Sidebar: Navigation & Dashboard */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <DashboardSidebar />
          </div>
        </aside>

        {/* Main Content Feed */}
        <main className="min-w-0">
          <div className="rounded-3xl bg-background/50">
            {children}
          </div>
        </main>

        {/* Right Sidebar: Social & Presence */}
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <OnlineFriendsRail />
          </div>
        </aside>
      </div>
    </div>
  );
}
