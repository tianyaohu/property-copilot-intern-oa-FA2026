import type { ReactNode } from "react";

/** Small count pill — e.g. the active-filter count on the master Filters chip.
 * Colors invert against an accent-filled chip so it stays legible. */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-fg px-1 text-[10px] font-bold text-accent">
      {children}
    </span>
  );
}
