"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/**
 * Route-level error boundary. Catches render/runtime errors thrown by a page
 * (a thrown Server Component, an unexpected client crash) and offers a retry
 * via Next's `reset`. The browse page handles its own fetch failures inline, so
 * this is the last-resort net for anything that escapes.
 */
export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Next.js always passes `error`. The copy stays generic so a minified
  // production message is not what the renter reads; the prop is still used
  // so the boundary signature stays intact.
  void error;

  return (
    <section className="py-16">
      <EmptyState
        tone="danger"
        titleAs="h1"
        autoFocus
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page."
        action={
          <Button variant="ghost" size="sm" className="max-sm:min-h-11" onClick={reset}>
            Try again
          </Button>
        }
      />
    </section>
  );
}
