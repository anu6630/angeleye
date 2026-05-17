'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const REPORT_EMAIL = 'report@pulse.com';

function buildMailto(postId: string | undefined) {
  const subject =
    postId != null && postId !== ''
      ? `Content report – Post ${postId}`
      : 'Content report';
  const body =
    postId != null && postId !== ''
      ? `I am reporting the following post.\n\nPost ID: ${postId}\n\nDetails:\n\n`
      : 'Details of what I am reporting:\n\n';
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const postId = searchParams.get('postId')?.trim() || undefined;
  const mailto = buildMailto(postId);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
      <div className="container mx-auto max-w-lg px-4 py-12">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-2xl tracking-tight">Report content</CardTitle>
            <CardDescription>
              Use this flow to flag content that breaks our community guidelines or the law.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {postId ? (
              <div className="rounded-lg border border-border/80 bg-muted/40 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Post ID</p>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">{postId}</p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Include this ID in your email so we can find the post quickly.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                No post was selected. Use the <span className="font-medium text-foreground">⋯</span> menu on a post
                and choose <span className="font-medium text-foreground">Report</span>, or copy the number from the
                post URL (<span className="font-mono text-xs">/notebooks/[id]</span>) and mention it in your email.
              </p>
            )}

            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                Send your report to{' '}
                <a href={`mailto:${REPORT_EMAIL}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {REPORT_EMAIL}
                </a>
                .
              </p>
              <p>
                We aim to take action on reported content <span className="font-medium text-foreground">within 24 hours</span>.
                If you provide evidence, we aim to complete <span className="font-medium text-foreground">permanent removal within one week</span>.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button asChild className="rounded-full">
                <a href={mailto}>
                  <Mail className="mr-2 h-4 w-4" aria-hidden />
                  Open email draft
                </a>
              </Button>
              <Button variant="outline" asChild className="rounded-full">
                <Link href="/feed">Back to feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ReportFallback() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-muted/30">
      <div className="container mx-auto max-w-lg px-4 py-12">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-2xl tracking-tight">Report content</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportFallback />}>
      <ReportContent />
    </Suspense>
  );
}
