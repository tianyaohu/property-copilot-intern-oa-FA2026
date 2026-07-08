"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

/**
 * Route-level error boundary. Catches render/runtime errors thrown by a page
 * (a thrown Server Component, an unexpected client crash) and offers a retry
 * via Next's `reset`. The browse page handles its own fetch failures inline, so
 * this is the last-resort net for anything that escapes.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="py-16">
      <EmptyState
        tone="danger"
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page."
        action={
          <Button variant="ghost" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </section>
  );
}
