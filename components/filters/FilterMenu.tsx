"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Popover } from "@/components/ui/Popover";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { isMobileSheetViewport } from "@/lib/mobileViewport";
import { cn } from "@/lib/cn";

/**
 * A short window (a phone on its side) still matches Tailwind `sm`, so the
 * price fields would be `sm:text-sm` / `sm:h-9` and the bedroom buttons and
 * checkbox rows would drop their `max-sm:` 44px targets. These overrides sit
 * on an ancestor, which beats the single-class utilities on the controls.
 * Keep the 500px cutoff in sync with `SHEET_MAX_HEIGHT_PX`.
 */
const SHORT_VIEWPORT_TARGETS = [
  "[@media(max-height:500px)]:[&_input[type=text]]:text-base",
  "[@media(max-height:500px)]:[&_input[type=text]]:h-11",
  "[@media(max-height:500px)]:[&_button]:min-h-11",
  "[@media(max-height:500px)]:[&_label]:min-h-11"
].join(" ");

function triggerButton(trigger: HTMLElement | null): HTMLButtonElement | null {
  return trigger?.querySelector<HTMLButtonElement>("button") ?? null;
}

/** Focus goes back to the chip when the dialog itself had it (Escape, Done,
 * the scrim). A press that has already moved focus onto another control must
 * keep that focus — moving it back scrolls the chip row and can swallow the
 * click that was about to open the next menu. */
function shouldRestoreFocus(active: Element | null, trigger: HTMLElement | null): boolean {
  if (!active || active === document.body || active === document.documentElement) return true;
  if (trigger?.contains(active)) return true;
  if (active.closest("[role='dialog']")) return true;
  if (active.getAttribute("aria-label") === "Dismiss") return true;
  return false;
}

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
 * Popover (wide, tall viewports) or a bottom sheet (a narrow phone, or a
 * short one — see `MOBILE_SHEET_MEDIA`).
 * Both share a heading, a scrolling body, and a Clear/Done footer. Manages
 * its own open/close. Escape, Done, and the scrim return focus to the
 * trigger; a press or tab that already moved focus somewhere else keeps it.
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
  // Set in the capture phase of mousedown, before the popover's bubble
  // listener calls `close`. Chrome focuses the pressed control *after*
  // mousedown listeners return, so `document.activeElement` is still inside
  // this dialog and a synchronous focus() on our chip scrolls the row.
  const pointerTargetRef = useRef<Element | null>(null);

  const close = () => {
    const trigger = triggerRef.current;
    const pointed = pointerTargetRef.current;
    pointerTargetRef.current = null;
    const active = document.activeElement instanceof Element ? document.activeElement : null;
    const pointedElsewhere =
      pointed !== null &&
      !trigger?.contains(pointed) &&
      !pointed.closest("[role='dialog']") &&
      pointed.getAttribute("aria-label") !== "Dismiss";
    setOpen(false);
    if (!pointedElsewhere && shouldRestoreFocus(active, trigger)) {
      triggerButton(trigger)?.focus();
    }
  };

  // The desktop popover is not modal: the page stays interactive, and Tab is
  // how a keyboard user reaches the next chip. Leaving the dialog open covers
  // that chip. Close when focus lands outside, and do not pull it back.
  useEffect(() => {
    if (!open || sheet) return;
    const onMouseDown = (event: MouseEvent) => {
      pointerTargetRef.current = event.target instanceof Element ? event.target : null;
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target === document.body || target === document.documentElement) return;
      const trigger = triggerRef.current;
      if (trigger?.contains(target)) return;
      if (target.closest("[role='dialog']")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, sheet]);

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
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto p-4",
          sheet && "overscroll-contain",
          sheet && SHORT_VIEWPORT_TARGETS
        )}
      >
        {children}
      </div>
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
