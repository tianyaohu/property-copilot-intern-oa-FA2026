"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { readSheetViewport } from "@/lib/mobileViewport";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type BottomSheetProps = {
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
};

/**
 * Modal bottom sheet for narrow viewports. Portaled to `document.body` so the
 * filter bar's `overflow-x-auto` (which also forces `overflow-y: auto`) cannot
 * clip it. Anchored to `visualViewport` rather than dismissed on `window`
 * `resize`: phones fire `resize` when the software keyboard opens, and iOS
 * reports that keyboard through `visualViewport` without changing
 * `innerHeight`. See `readSheetViewport`.
 */
export function BottomSheet({ onClose, labelledBy, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(readSheetViewport);

  useEffect(() => {
    const sync = () => setBox(readSheetViewport());
    sync();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    // Android Chrome resizes the layout viewport when the keyboard opens.
    // Recompute the inset; do not treat that resize as a dismiss.
    window.addEventListener("resize", sync);
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const { inset, maxHeight } = box;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Dismiss" className="absolute inset-0 bg-fg/40" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        data-presentation="sheet"
        data-keyboard-inset={inset}
        style={{ bottom: inset, maxHeight }}
        className={cn(
          "absolute inset-x-0 z-10 flex flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-popover outline-none",
          // Home-indicator padding only while the keyboard is closed. The
          // keyboard already covers that inset, and `viewport-fit=cover` is
          // what makes env(safe-area-inset-bottom) non-zero. The class has to
          // be a whole string so Tailwind emits it.
          inset === 0 && "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div aria-hidden className="flex justify-center pt-2">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
