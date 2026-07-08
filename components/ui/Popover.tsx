"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

const DEFAULT_PANEL_WIDTH = 320; // px
const VIEWPORT_MARGIN = 8; // px, keeps the panel off the screen edge
const TRIGGER_GAP = 8; // px, space between the trigger and the panel

type PopoverProps = {
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  labelledBy: string;
  /** Panel width in px. Defaults to 320; widen for content that needs more
   * horizontal room (e.g. a 6-across button row) to avoid an awkward wrap. */
  width?: number;
  children: ReactNode;
};

/**
 * Generic anchored-panel shell: a floating panel positioned under a trigger,
 * with no full-screen backdrop — the background stays interactive, unlike a
 * true modal. Filter-domain-agnostic; consumed by FilterMenu.
 *
 * Uses `position: fixed` rather than `absolute`: the filter bar row uses
 * `overflow-x-auto`, which per the CSS overflow spec also computes `overflow-y`
 * to `auto` — an absolutely-positioned panel nested there would be clipped the
 * moment it extends past the row's own (short) box. `fixed` escapes that
 * without needing a portal.
 *
 * The panel is a `flex-col` box with a height cap, so a caller can give it a
 * scrolling body and a pinned footer (see FilterMenu); short content just
 * doesn't scroll.
 */
export function Popover({ triggerRef, onClose, labelledBy, width = DEFAULT_PANEL_WIDTH, children }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(rect.left, VIEWPORT_MARGIN),
      window.innerWidth - width - VIEWPORT_MARGIN
    );
    const top = rect.bottom + TRIGGER_GAP;
    setLayout({ top, left, maxHeight: window.innerHeight - top - VIEWPORT_MARGIN });
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
    // mousedown (not click) so containment is checked at press time — a press
    // that starts inside the panel is never an "outside click", no matter where
    // it is released. Registered after the opening click has fully completed,
    // so it can't immediately self-close.
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
    // If the layout shifts under the panel, dismiss rather than continuously
    // re-measuring. Scrolling *inside* the panel (a tall master filter list)
    // must not count — hence the containment guard on the scroll target.
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onResize = () => onClose();
    window.addEventListener("scroll", onScroll, { capture: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, [onClose]);

  if (!layout) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby={labelledBy}
      style={{ position: "fixed", top: layout.top, left: layout.left, width, maxHeight: layout.maxHeight }}
      className="z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-popover"
    >
      {children}
    </div>
  );
}
