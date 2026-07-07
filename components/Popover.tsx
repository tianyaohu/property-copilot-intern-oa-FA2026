"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

const DEFAULT_PANEL_WIDTH = 320; // px
const VIEWPORT_MARGIN = 8; // px, keeps the panel off the screen edge
const TRIGGER_GAP = 8; // px, space between the trigger pill and the panel

type PopoverProps = {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  labelledBy: string;
  /** Panel width in px. Defaults to 320; widen for content that needs more
   * horizontal room (e.g. a 6-across button row) to avoid an awkward wrap. */
  width?: number;
  children: ReactNode;
};

/**
 * Generic anchored-panel shell: a small floating panel positioned under a
 * trigger button, with no full-screen backdrop — the background stays
 * interactive, unlike a true modal. Filter-domain-agnostic; consumed by
 * PriceFilterPopover and RoomsFilterPopover.
 *
 * Uses `position: fixed` rather than `absolute`: FilterPillBar's pill row
 * uses `overflow-x-auto`, which per the CSS overflow spec also computes
 * `overflow-y` to `auto` — an absolutely-positioned panel nested in that row
 * would get clipped the moment it extends past the row's own (short) box.
 * `fixed` escapes that the same way the old FiltersModal's `fixed inset-0`
 * did, without needing a portal.
 */
export function Popover({ triggerRef, onClose, labelledBy, width = DEFAULT_PANEL_WIDTH, children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN
    );
    setPosition({ top: rect.bottom + TRIGGER_GAP, left });
  }, [triggerRef, width]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    // mousedown (not click) so containment is checked at press time — a
    // press that starts inside the panel is never an "outside click", no
    // matter where the pointer is released. This effect is registered after
    // the click that opened the popover has already fully completed (mouse
    // down/up/click all fire before React commits the state update that
    // mounts this component), so it can't immediately self-close.
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose, triggerRef]);

  useEffect(() => {
    // If the layout moves under the panel, just dismiss rather than
    // continuously re-measuring — simpler and avoids a stale position.
    const onDismiss = () => onClose();
    window.addEventListener("scroll", onDismiss, { capture: true });
    window.addEventListener("resize", onDismiss);
    return () => {
      window.removeEventListener("scroll", onDismiss, { capture: true });
      window.removeEventListener("resize", onDismiss);
    };
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby={labelledBy}
      style={{ position: "fixed", top: position.top, left: position.left, width }}
      className="z-50 rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      {children}
    </div>
  );
}
