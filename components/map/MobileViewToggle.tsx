"use client";

type Props = { value: "map" | "list"; onChange: (v: "map" | "list") => void };

/**
 * Phone-only map/list switch. Pinned to the bottom edge, not the vertical
 * center: choosing List scrolls the selected card to center, and a control
 * fixed on that same line covers the card's photo and rent. A bottom bar sits
 * in the thumb zone and clears that card. The outer box is full-bleed but
 * ignores hits, so it doesn't swallow map drags; only the buttons are
 * tappable. `sm:hidden` matches the breakpoint where both panes show at once.
 */
export function MobileViewToggle({ value, onChange }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
      <div
        role="group"
        aria-label="Map or list"
        className="pointer-events-auto flex overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
      >
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`min-h-11 min-w-[4.75rem] border-r border-border px-5 text-sm font-medium last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
              value === v
                ? "bg-accent text-accent-fg focus-visible:ring-accent-fg"
                : "bg-surface text-fg focus-visible:ring-accent"
            }`}
          >
            {v === "map" ? "Map" : "List"}
          </button>
        ))}
      </div>
    </div>
  );
}
