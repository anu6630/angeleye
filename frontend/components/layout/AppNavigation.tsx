'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { BookMarked, Bookmark, Compass, LogIn, LogOut, PenSquare, Search, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { href: '/feed', label: 'Feed', icon: Compass },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/my-notebooks', label: 'My notebooks', icon: BookMarked },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/notebooks/new', label: 'New', icon: PenSquare, emphasis: true as const },
];

export function AppNavigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser().catch(() => {});
  }, [fetchUser]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href={isAuthenticated ? '/feed' : '/'}
          className="group flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition group-hover:opacity-90">
            <BookMarked className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden sm:inline">IdeaLit</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {navLinks.map(({ href, label, icon: Icon, emphasis }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}>
                <Button
                  variant={emphasis ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-1.5 rounded-full px-3',
                    !emphasis && active && 'bg-muted text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 opacity-80" aria-hidden />
                  {label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navLinks.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-full pl-1 pr-2">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={user.avatar_url || undefined} alt="" />
                    <AvatarFallback className="bg-muted text-xs font-medium">
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:inline">
                    {user.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.username}`} className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="rounded-full" asChild>
                <Link href="/login" className="gap-1.5">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
              <Button size="sm" className="hidden rounded-full sm:inline-flex" asChild>
                <Link href="/">Join</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
