"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = {
  label: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/** Checkbox + label as one clickable row. `accent-accent` colors the native
 * check with the accent token, so it inverts correctly in dark mode. */
export function Checkbox({ label, ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-border accent-accent focus:ring-accent"
        {...props}
      />
      {label}
    </label>
  );
}
