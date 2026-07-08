"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "link";
type Size = "sm" | "md";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base =
  "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "rounded-md bg-accent text-accent-fg hover:bg-accent/90 disabled:bg-border disabled:text-muted",
  ghost: "rounded-md border border-border bg-surface text-fg hover:border-fg/30 disabled:opacity-50",
  link: "text-sm text-fg underline underline-offset-2 hover:text-muted disabled:opacity-50"
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm"
};

/** The one primary/secondary/text button in the app. Replaces the black-button
 * and underlined "Clear" class strings that were duplicated across the filter
 * surfaces. `type` defaults to "button" so it never accidentally submits. */
export function Button({ variant = "primary", size = "md", type = "button", className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], variant !== "link" && sizes[size], className)}
      {...props}
    />
  );
}
