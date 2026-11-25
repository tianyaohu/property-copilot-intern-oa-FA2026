import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Browse rentals in Metro Vancouver",
  description:
    "Browse rental listings across Vancouver, Richmond, Burnaby, and Surrey on a map. Filter by price, bedrooms, bathrooms, and property type."
};

export default function BrowseLayout({ children }: { children: ReactNode }) {
  return children;
}
