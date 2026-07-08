import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <section className="py-16">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link
            href="/browse"
            className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-semibold text-fg transition-colors hover:border-fg/30"
          >
            Browse listings
          </Link>
        }
      />
    </section>
  );
}
