"use client";

import { useState, type RefObject } from "react";
import { validatePriceRange } from "@/lib/priceValidation";
import { Popover } from "@/components/Popover";
import { errorTextClass, inputClass, labelClass } from "@/components/filterStyles";

function numberOrUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

type PriceRange = { minRent?: number; maxRent?: number };

type PriceFilterPopoverProps = {
  minRent: number | undefined;
  maxRent: number | undefined;
  onApply: (patch: PriceRange) => void;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

/**
 * Quick Price-only popover — rent range alone, no rooms. Stages edits in a
 * local draft, committed only on "Apply"; "Clear" resets just these two
 * fields immediately, mirroring the Filters modal's "Clear all" but scoped
 * to price so it can never touch bedrooms/bathrooms/property type.
 */
export function PriceFilterPopover({
  minRent,
  maxRent,
  onApply,
  onClose,
  triggerRef
}: PriceFilterPopoverProps) {
  const [draft, setDraft] = useState<PriceRange>({ minRent, maxRent });
  const error = validatePriceRange(draft.minRent, draft.maxRent);

  const handleApply = () => {
    if (error) return;
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft({});
    onApply({ minRent: undefined, maxRent: undefined });
  };

  return (
    <Popover triggerRef={triggerRef} onClose={onClose} labelledBy="price-popover-title">
      <div className="p-4">
        <h2 id="price-popover-title" className="mb-3 text-sm font-semibold text-gray-900">
          Price range
        </h2>
        <div className="flex items-center gap-3">
          <label className={labelClass}>
            Minimum
            <input
              type="number"
              min={0}
              step={100}
              placeholder="Any"
              value={draft.minRent ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, minRent: numberOrUndefined(e.target.value) }))}
              aria-invalid={error !== null}
              aria-describedby={error ? "price-popover-error" : undefined}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Maximum
            <input
              type="number"
              min={0}
              step={100}
              placeholder="Any"
              value={draft.maxRent ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, maxRent: numberOrUndefined(e.target.value) }))}
              aria-invalid={error !== null}
              aria-describedby={error ? "price-popover-error" : undefined}
              className={inputClass}
            />
          </label>
        </div>
        {error ? (
          <p id="price-popover-error" role="alert" className={`mt-2 ${errorTextClass}`}>
            {error}
          </p>
        ) : null}
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
          disabled={error !== null}
          className="rounded-md border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
        >
          Apply
        </button>
      </div>
    </Popover>
  );
}
