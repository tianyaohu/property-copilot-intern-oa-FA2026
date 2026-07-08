import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Property Copilot — Map Browser</h1>
      <p className="max-w-2xl text-sm text-muted">
        A map-based rental browser for Metro Vancouver. Listings are served from
        DynamoDB through a geospatial viewport query; browse them on the map and
        narrow them down with composable filters.
      </p>
      <Link
        className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-semibold text-fg transition-colors hover:border-fg/30"
        href="/browse"
      >
        Browse listings
      </Link>
    </section>
  );
}
