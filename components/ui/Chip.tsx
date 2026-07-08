"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ChipProps = {
  active?: boolean;
  /** When provided and the chip is active, an inline ✕ appears to clear just
   * this dimension without opening the popover. */
  onClear?: () => void;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

/**
 * Rounded-full filter trigger. The whole chip is the anchor the popover
 * positions against (ref forwarded to the container), so it stays a single
 * unit even when it carries an inline clear button. The label and the ✕ are
 * separate buttons — clicking ✕ clears the filter; clicking the label opens
 * the popover.
 */
export const Chip = forwardRef<HTMLDivElement, ChipProps>(function Chip(
  { active = false, onClear, children, className, ...buttonProps },
  ref
) {
  const showClear = active && Boolean(onClear);

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border text-sm font-semibold shadow-sm transition-colors",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface text-fg hover:border-fg/30",
        className
      )}
    >
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 rounded-full py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
          showClear ? "pl-3 pr-1.5" : "px-3"
        )}
        {...buttonProps}
      >
        {children}
      </button>
      {showClear ? (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={onClear}
          className="mr-1 flex h-5 w-5 items-center justify-center rounded-full text-accent-fg/80 transition-colors hover:bg-accent-fg/20 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg"
        >
          <svg viewBox="0 0 14 14" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
          </svg>
        </button>
      ) : null}
    </div>
  );
});
