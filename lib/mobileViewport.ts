/** Tailwind `sm` starts at 640px. Below that a fixed-width filter popover
 * does not fit the screen. */
export const SHEET_MAX_WIDTH_PX = 639;

/** A phone on its side is wider than `sm` (an iPhone SE landscape is 667px)
 * but only about 375px tall. The anchored popover dismisses on `window`
 * `resize`, and that is exactly what the software keyboard — and an iOS
 * focus-zoom of a 14px field — fires. A short window uses the sheet instead. */
export const SHEET_MAX_HEIGHT_PX = 500;

export const MOBILE_SHEET_MEDIA = `(max-width: ${SHEET_MAX_WIDTH_PX}px), (max-height: ${SHEET_MAX_HEIGHT_PX}px)`;

const SHEET_TOP_GAP = 16;

export function isMobileSheetViewport(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(MOBILE_SHEET_MEDIA).matches;
}

/**
 * Where a fixed bottom sheet has to sit so it stays in the *visual* viewport.
 *
 * `window.innerHeight` is the layout viewport. The software keyboard (and, on
 * iOS, the browser chrome) shrinks `visualViewport` instead, and iOS often
 * does not change `innerHeight` at all. The covered strip at the bottom is:
 *
 *   innerHeight − visualViewport.offsetTop − visualViewport.height
 *
 * `bottom` on a `position: fixed` sheet should be that inset. `maxHeight`
 * is the visible height minus a gap, so a tall panel can't extend above the
 * visual viewport when the page has been panned to keep the caret in view.
 *
 * `offsetTop` is negative while the page rubber-bands past the top. That is
 * overscroll, not the keyboard; subtracting a negative number
 * (`innerHeight - (-n) - visible`) lifts the sheet off the bottom edge for
 * as long as the finger is down. Clamp it to zero first.
 *
 * The old `Math.max(160, visible - gap)` floor made a short landscape
 * keyboard (about 150px visible) size the sheet at 160px, so the title and
 * the fields sat above the visual viewport. The sheet shrinks with the
 * visible area instead.
 */
export function readSheetViewport(): { inset: number; maxHeight: number } {
  const vv = window.visualViewport;
  const layoutHeight = window.innerHeight;
  const visible = vv?.height ?? layoutHeight;
  const offsetTop = Math.max(0, vv?.offsetTop ?? 0);
  const inset = vv ? Math.max(0, Math.round(layoutHeight - offsetTop - visible)) : 0;
  return { inset, maxHeight: Math.max(0, Math.round(visible - SHEET_TOP_GAP)) };
}
