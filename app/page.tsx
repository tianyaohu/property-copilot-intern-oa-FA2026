import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Property Copilot — Map Browser</h1>
      <p className="max-w-2xl text-sm text-gray-700">
        A map-based rental browser for Metro Vancouver. Listings are served from
        DynamoDB through a geospatial viewport query; browse them on the map and
        narrow them down with composable filters.
      </p>
      <Link
        className="inline-block rounded border px-3 py-2 text-sm hover:border-gray-400"
        href="/browse"
      >
        Browse listings
      </Link>
    </section>
  );
}
