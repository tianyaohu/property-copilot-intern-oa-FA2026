"use client";

import { useState, type RefObject } from "react";
import { Popover } from "@/components/Popover";
import { OptionRow } from "@/components/OptionRow";
import { BATHROOM_OPTIONS, BEDROOM_OPTIONS } from "@/components/roomFilterOptions";

type Rooms = { bedrooms?: number; bedroomsExact?: boolean; bathrooms?: number };

type RoomsFilterPopoverProps = {
  bedrooms: number | undefined;
  bedroomsExact: boolean | undefined;
  bathrooms: number | undefined;
  onApply: (patch: Rooms) => void;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

/**
 * Quick Bedrooms/Bathrooms-only popover. Bedrooms is a segmented row
 * (Studio/1/2/3/4/5) with an "exact match" toggle — unchecked means "at
 * least N" (today's minimum semantics), checked means "exactly N"; clicking
 * the already-selected value again clears it back to "Any". Bathrooms is
 * minimum-only (Any/1+/2+/3+/4+), no exact-match option.
 */
export function RoomsFilterPopover({
  bedrooms,
  bedroomsExact,
  bathrooms,
  onApply,
  onClose,
  triggerRef
}: RoomsFilterPopoverProps) {
  const [draft, setDraft] = useState<Rooms>({ bedrooms, bedroomsExact, bathrooms });

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft({});
    onApply({ bedrooms: undefined, bedroomsExact: undefined, bathrooms: undefined });
  };

  return (
    <Popover triggerRef={triggerRef} onClose={onClose} labelledBy="rooms-popover-title" width={384}>
      <div className="p-4">
        <h2 id="rooms-popover-title" className="mb-3 text-sm font-semibold text-gray-900">
          Bedrooms &amp; bathrooms
        </h2>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Bedrooms</p>
          <OptionRow
            options={BEDROOM_OPTIONS}
            value={draft.bedrooms}
            onChange={(value) =>
              setDraft((prev) => ({ ...prev, bedrooms: prev.bedrooms === value ? undefined : value }))
            }
          />
          <label className="flex items-center gap-2 pt-1 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={draft.bedroomsExact ?? false}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, bedroomsExact: e.target.checked || undefined }))
              }
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            Use exact match
          </label>
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-600">Bathrooms</p>
          <OptionRow
            options={BATHROOM_OPTIONS}
            value={draft.bathrooms}
            onChange={(value) => setDraft((prev) => ({ ...prev, bathrooms: value }))}
          />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={handleClear}
          className="text-sm font-semibold text-gray-900 underline hover:text-gray-700"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-md border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Apply
        </button>
      </div>
    </Popover>
  );
}
