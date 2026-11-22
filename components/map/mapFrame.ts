/**
 * Shared map frame so the loading shell and the live map stay the same size.
 *
 * Below `sm`, 70vh starts under the title and filters and runs underneath the
 * fixed Map/List bar (about 67px of overlap at 390×844, covering the
 * attribution and the southern markers). 28.5rem is the header, the title,
 * the filter row, that bar, and a status or error line above the map — the
 * error block is taller than the one-line count, and the canvas still has to
 * end above the bar. `sm` / `lg` restore the tablet and desktop heights.
 */
export const MAP_FRAME_CLASS =
  "h-[calc(100dvh-28.5rem)] w-full overflow-hidden rounded-lg border border-border sm:h-[420px] lg:h-full";
