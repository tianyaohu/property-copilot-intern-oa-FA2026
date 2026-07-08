"use client";

import { cn } from "@/lib/cn";

type SegmentedOption<T> = {
  value: T;
  label: string;
};

type SegmentedProps<T> = {
  options: SegmentedOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

/**
 * A segmented row of mutually-exclusive buttons — e.g. Studio/1/2/3/4/5 for
 * bedrooms, or Any/1+/2+/3+/4+ for bathrooms. Dumb: it renders `options` and
 * reports whichever one was clicked verbatim. The caller decides what clicking
 * the already-selected option should do (toggle back to "Any", or leave it) —
 * bedrooms and bathrooms want different behavior, so that lives with the caller.
 */
export function Segmented<T>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex flex-wrap overflow-hidden rounded-md border border-border">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={index}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-11 border-r border-border px-3 py-2 text-sm font-medium transition-colors last:border-r-0",
              selected ? "bg-accent text-accent-fg" : "bg-surface text-fg hover:bg-fg/5"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
