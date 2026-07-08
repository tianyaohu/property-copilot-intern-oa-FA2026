"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/Popover";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

type FilterMenuProps = {
  /** Chip contents — usually the active filter's value, or the dimension name. */
  label: ReactNode;
  /** Popover heading, also its accessible name. */
  title: string;
  active?: boolean;
  width?: number;
  /** Clears this dimension. Wired to both the footer button and (unless
   * `chipClearable` is false) the chip's inline ✕. */
  onClear?: () => void;
  clearLabel?: string;
  /** Whether the active chip shows an inline ✕. False for the master chip,
   * whose reset lives in the bar's dedicated "Clear all". */
  chipClearable?: boolean;
  children: ReactNode;
};

/**
 * The one filter-popover abstraction: a Chip trigger + an anchored Popover with
 * a heading, a scrolling body, and a Clear/Done footer. Manages its own
 * open/close and returns focus to the trigger on close. Single-open-at-a-time
 * falls out for free — opening another menu is an outside-mousedown that
 * dismisses this one — so the bar needs no shared "which panel is open" state.
 */
export function FilterMenu({
  label,
  title,
  active = false,
  width,
  onClear,
  clearLabel = "Clear",
  chipClearable = true,
  children
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = () => {
    setOpen(false);
    triggerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  };

  return (
    <>
      <Chip
        ref={triggerRef}
        active={active}
        onClear={chipClearable ? onClear : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
      </Chip>

      {open ? (
        <Popover triggerRef={triggerRef} onClose={close} labelledBy={titleId} width={width}>
          <div className="border-b border-border px-4 py-3">
            <h2 id={titleId} className="text-sm font-semibold text-fg">
              {title}
            </h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            {onClear ? (
              <Button variant="link" onClick={onClear}>
                {clearLabel}
              </Button>
            ) : (
              <span />
            )}
            <Button variant="primary" size="sm" onClick={close}>
              Done
            </Button>
          </div>
        </Popover>
      ) : null}
    </>
  );
}
