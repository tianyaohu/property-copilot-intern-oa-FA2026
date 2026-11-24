import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Copilot — Map Browser",
  description: "Map-based rental browser scaffold for Metro Vancouver"
};

// `cover` is what makes env(safe-area-inset-*) non-zero on notched phones.
// The filter sheet uses the bottom inset to clear the home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

const headerLink =
  "inline-flex items-center rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface max-sm:min-h-11";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3 text-sm">
        <Link className={`${headerLink} font-semibold tracking-tight`} href="/">
          Property Copilot
        </Link>
        <Link className={`${headerLink} text-muted transition-colors hover:text-fg`} href="/browse">
          Browse
        </Link>
      </nav>
    </header>
  );
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        <main className="px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
