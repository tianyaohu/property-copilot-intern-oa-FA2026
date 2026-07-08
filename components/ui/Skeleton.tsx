import { cn } from "@/lib/cn";

/** A single shimmering placeholder block. Compose these to mirror a component's
 * layout while its data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-fg/10", className)} />;
}

/** Placeholder that matches PropertyCard's shape, so the loading grid holds the
 * same footprint the real results will. */
export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
