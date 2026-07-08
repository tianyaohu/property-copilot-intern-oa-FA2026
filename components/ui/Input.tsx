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
        "h-9 w-full rounded-md border border-border bg-surface px-2 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
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
