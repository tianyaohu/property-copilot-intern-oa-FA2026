"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type InputProps = {
  /** When set, the input is wrapped in a labelled column. */
  label?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

/** Text/number input styled from tokens. Absorbs the old filterStyles label +
 * input class strings; pass `label` to get the labelled-field layout. */
export function Input({ label, className, ...props }: InputProps) {
  const input = (
    <input
      className={cn(
        // text-base (16px) below `sm` so iOS Safari does not zoom the page on
        // focus — that zoom is a viewport change, and it used to dismiss the
        // filter popover mid-keystroke. h-11 is the 44px touch minimum.
        "h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:h-9 sm:px-2 sm:text-sm",
        className
      )}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-muted">
      {label}
      {input}
    </label>
  );
}
