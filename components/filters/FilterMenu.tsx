"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/Popover";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { isMobileSheetViewport } from "@/lib/mobileViewport";
import { cn } from "@/lib/cn";

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
 * The one filter-menu abstraction: a Chip trigger plus either an anchored
 * Popover (wide viewports) or a bottom sheet (below the `sm` breakpoint).
 * Both share a heading, a scrolling body, and a Clear/Done footer. Manages
 * its own open/close and returns focus to the trigger on close.
 *
 * On desktop, single-open-at-a-time falls out for free — opening another menu
 * is an outside-mousedown that dismisses this one — so the bar needs no
 * shared "which panel is open" state. On a phone the sheet is modal: the
 * scrim covers the other chips until Done, Dismiss, or Escape.
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
  // Chosen when the menu opens, not on every render, so a keyboard-driven
  // viewport resize can't swap presentations out from under an in-progress edit.
  const [sheet, setSheet] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = () => {
    setOpen(false);
    triggerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    setSheet(isMobileSheetViewport());
    setOpen(true);
  };

  // 44px targets in the sheet. The anchored popover keeps its compact footer;
  // a phone's Clear/Done sit in the thumb zone and have to clear the HIG minimum.
  const footerButton = sheet ? "min-h-11 px-3" : undefined;

  const panel = (
    <>
      <div className="border-b border-border px-4 py-3">
        <h2 id={titleId} className="text-sm font-semibold text-fg">
          {title}
        </h2>
      </div>
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-4", sheet && "overscroll-contain")}>{children}</div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        {onClear ? (
          <Button variant="link" className={footerButton} onClick={onClear}>
            {clearLabel}
          </Button>
        ) : (
          <span />
        )}
        <Button variant="primary" size="sm" className={footerButton} onClick={close}>
          Done
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Chip
        ref={triggerRef}
        active={active}
        onClear={chipClearable ? onClear : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        {label}
      </Chip>

      {open && sheet ? (
        <BottomSheet onClose={close} labelledBy={titleId}>
          {panel}
        </BottomSheet>
      ) : null}

      {open && !sheet ? (
        <Popover triggerRef={triggerRef} onClose={close} labelledBy={titleId} width={width}>
          {panel}
        </Popover>
      ) : null}
    </>
  );
}
