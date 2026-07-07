"use client";

import { useEffect, useRef, useState } from "react";
import type { PropertyFilter } from "@/lib/types";
import { validatePriceRange } from "@/lib/priceValidation";
import { OptionRow } from "@/components/OptionRow";
import { BATHROOM_OPTIONS, BEDROOM_OPTIONS } from "@/components/roomFilterOptions";
import { errorTextClass, inputClass, labelClass } from "@/components/filterStyles";

type FiltersModalProps = {
  filter: PropertyFilter;
  onApply: (filter: PropertyFilter) => void;
  onClose: () => void;
};

function numberOrUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

/**
 * Master filter panel: encompasses every dimension (price range, bedrooms,
 * bathrooms) in one place, alongside the quick single-field PriceFilterPopover
 * and RoomsFilterPopover — all three commit to the same shared filter state,
 * so they always agree. Edits are staged in `draft` and only committed (via
 * onApply) on "Apply filters" or "Clear all" — Escape, click-outside, and the
 * close button discard the draft instead. Apply is disabled while the price
 * range is invalid (negative bound, or min greater than max).
 */
export function FiltersModal({ filter, onApply, onClose }: FiltersModalProps) {
  const [draft, setDraft] = useState<PropertyFilter>(() => filter);
  const panelRef = useRef<HTMLDivElement>(null);
  // Click-outside must mean press AND release on the backdrop: a drag that
  // starts inside the panel (e.g. selecting text in a price input) and ends
  // over the backdrop fires the overlay's click, and without this guard it
  // would close the modal and silently discard the draft.
  const pressStartedOnBackdrop = useRef(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const set = (patch: Partial<PropertyFilter>) => setDraft((prev) => ({ ...prev, ...patch }));
  const priceError = validatePriceRange(draft.minRent, draft.maxRent);

  const handleApply = () => {
    if (priceError) return;
    onApply(draft);
    onClose();
  };

  // Commits immediately and leaves the modal open, mirroring the old
  // "Reset all" button's instant-commit (no confirmation step).
  const handleClearAll = () => {
    setDraft({});
    onApply({});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressStartedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 id="filters-modal-title" className="text-base font-semibold">
            Filters
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:border-gray-400"
          >
            
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900">Price range</p>
            <div className="flex items-center gap-3">
              <label className={labelClass}>
                Minimum
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Any"
                  value={draft.minRent ?? ""}
                  onChange={(e) => set({ minRent: numberOrUndefined(e.target.value) })}
                  aria-invalid={priceError !== null}
                  aria-describedby={priceError ? "price-range-error" : undefined}
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
                  onChange={(e) => set({ maxRent: numberOrUndefined(e.target.value) })}
                  aria-invalid={priceError !== null}
                  aria-describedby={priceError ? "price-range-error" : undefined}
                  className={inputClass}
                />
              </label>
            </div>
            {priceError ? (
              <p id="price-range-error" role="alert" className={errorTextClass}>
                {priceError}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-900">Rooms</p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Bedrooms</p>
              <OptionRow
                options={BEDROOM_OPTIONS}
                value={draft.bedrooms}
                onChange={(bedrooms) =>
                  set({ bedrooms: draft.bedrooms === bedrooms ? undefined : bedrooms })
                }
              />
              <label className="flex items-center gap-2 pt-1 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={draft.bedroomsExact ?? false}
                  onChange={(e) => set({ bedroomsExact: e.target.checked || undefined })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                Use exact match
              </label>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Bathrooms</p>
              <OptionRow
                options={BATHROOM_OPTIONS}
                value={draft.bathrooms}
                onChange={(bathrooms) => set({ bathrooms })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm font-semibold text-gray-900 underline hover:text-gray-700"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={priceError !== null}
            className="rounded-md border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
