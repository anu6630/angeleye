import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NotebookSocial - Feed",
  description: "Discover Python notebooks from the community",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Header for public pages */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/feed" className="flex items-center gap-2">
              <span className="text-xl font-bold">NotebookSocial</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link href="/feed">
                <Button variant="ghost" size="sm">
                  Feed
                </Button>
              </Link>
              <Link href="/my-notebooks">
                <Button variant="ghost" size="sm">
                  My Notebooks
                </Button>
              </Link>
              <Link href="/notebooks/new">
                <Button size="sm">
                  Create Notebook
                </Button>
              </Link>
              {/* Auth state handled via auth-store for login/logout */}
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
