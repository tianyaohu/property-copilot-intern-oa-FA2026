/** Tailwind `sm` (640px). Below it the browse page is a single pane, and a
 * fixed-width filter popover no longer fits the screen. */
export const MOBILE_SHEET_MEDIA = "(max-width: 639px)";

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
 */
export function readSheetViewport(): { inset: number; maxHeight: number } {
  const vv = window.visualViewport;
  const visible = vv?.height ?? window.innerHeight;
  const inset = vv ? Math.max(0, Math.round(window.innerHeight - vv.offsetTop - visible)) : 0;
  return { inset, maxHeight: Math.max(160, Math.round(visible - SHEET_TOP_GAP)) };
}
