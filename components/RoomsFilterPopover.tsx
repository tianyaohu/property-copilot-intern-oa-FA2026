"use client";

import type { RefObject } from "react";
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
 * least N" (minimum semantics), checked means "exactly N"; clicking the
 * already-selected value again clears it back to "Any". Bathrooms is
 * minimum-only (Any/1+/2+/3+/4+), no exact-match option.
 *
 * Unlike PriceFilterPopover (which stages edits and needs an explicit Apply
 * to gate on validation), every click here commits immediately — a bedroom
 * or bathroom button click can't produce an invalid state, so there's
 * nothing to stage or validate. The popover stays open after a click so
 * bedrooms, bathrooms, and exact-match can be adjusted in any order; "Done"
 * just closes it.
 */
export function RoomsFilterPopover({
  bedrooms,
  bedroomsExact,
  bathrooms,
  onApply,
  onClose,
  triggerRef
}: RoomsFilterPopoverProps) {
  const handleClear = () => {
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
            value={bedrooms}
            onChange={(value) =>
              onApply({ bedrooms: bedrooms === value ? undefined : value, bedroomsExact, bathrooms })
            }
          />
          <label className="flex items-center gap-2 pt-1 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={bedroomsExact ?? false}
              onChange={(e) =>
                onApply({ bedrooms, bedroomsExact: e.target.checked || undefined, bathrooms })
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
            value={bathrooms}
            onChange={(value) => onApply({ bedrooms, bedroomsExact, bathrooms: value })}
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
          onClick={onClose}
          className="rounded-md border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Done
        </button>
      </div>
    </Popover>
  );
}
