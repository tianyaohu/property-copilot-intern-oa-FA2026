import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Copilot — Map Browser",
  description: "Map-based rental browser scaffold for Metro Vancouver"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 text-sm">
            <Link className="font-semibold" href="/">
              Property Copilot
            </Link>
            <Link href="/browse">Browse</Link>
          </nav>
        </header>
        <main className="px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
