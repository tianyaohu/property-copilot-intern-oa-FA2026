"use client";

type Props = { value: "map" | "list"; onChange: (v: "map" | "list") => void };

export function MobileViewToggle({ value, onChange }: Props) {
  return (
    <div className="fixed right-3 top-1/2 z-40 -translate-y-1/2 flex flex-col overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg sm:hidden">
      {(["map", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`px-3 py-2 text-sm font-medium border-b border-gray-300 last:border-b-0 ${
            value === v ? "bg-black text-white" : "bg-white text-gray-900 hover:bg-gray-50"
          }`}
        >
          {v === "map" ? "Map" : "List"}
        </button>
      ))}
    </div>
  );
}
