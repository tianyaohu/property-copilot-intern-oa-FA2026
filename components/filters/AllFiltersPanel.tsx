"use client";

import type { ReactNode } from "react";
import { PriceFilter } from "@/components/filters/PriceFilter";
import { RoomsFilter } from "@/components/filters/RoomsFilter";
import { PropertyTypeFilter } from "@/components/filters/PropertyTypeFilter";
import type { FilterBodyProps } from "@/components/filters/filterOptions";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {children}
    </section>
  );
}

/**
 * Master panel: every dimension in one place, reusing the exact same body
 * components as the quick menus, so the two surfaces can never drift apart.
 * Rendered inside a FilterMenu (the master "Filters" chip), so it needs no
 * chrome of its own — just the stacked sections.
 */
export function AllFiltersPanel({ filter, onChange }: FilterBodyProps) {
  return (
    <div className="space-y-4">
      <Section title="Price range">
        <PriceFilter filter={filter} onChange={onChange} />
      </Section>
      <Section title="Rooms">
        <RoomsFilter filter={filter} onChange={onChange} />
      </Section>
      <Section title="Property type">
        <PropertyTypeFilter filter={filter} onChange={onChange} />
      </Section>
    </div>
  );
}
