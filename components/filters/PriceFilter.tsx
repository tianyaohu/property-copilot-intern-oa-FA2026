"use client";

import { useEffect, useState } from "react";
import { validatePriceRange } from "@/lib/priceValidation";
import { Input } from "@/components/ui/Input";
import type { FilterBodyProps } from "@/components/filters/filterOptions";

/** A complete decimal. Partials ("1.", "-", "1e") and non-numeric tokens stay out. */
const COMPLETE_RENT = /^-?\d+(?:\.\d+)?$/;

/**
 * "" is an explicit clear. Any other token that is not a complete finite
 * decimal is NaN, which `rentRangeIssue` rejects. A number input sanitizes
 * those tokens ("e", ".", "NaN", "Infinity", "1e309") to "", and committing
 * that empty string drops the bound — the next list request then returns
 * every listing in the viewport.
 */
function numberOrUndefined(value: string): number | undefined {
  // Only a fully empty field clears the bound. A whitespace-only value is not
  // a clear — committing it would drop the filter the same way "" used to.
  if (value === "") return undefined;
  const trimmed = value.trim();
  if (!COMPLETE_RENT.test(trimmed)) return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Rent range, applied instantly. The raw input text is held locally so a
 * half-typed or momentarily-inverted range (min > max) can exist on screen
 * without being pushed to the shared filter — the backend rejects an inverted
 * range, so only a *valid* range is committed upward. The two sync effects
 * re-seed the inputs when the applied values change from outside (e.g. the
 * master panel's "Clear all"); committing our own valid value is a no-op there
 * since the text already matches.
 */
export function PriceFilter({ filter, onChange }: FilterBodyProps) {
  const [minText, setMinText] = useState(filter.minRent?.toString() ?? "");
  const [maxText, setMaxText] = useState(filter.maxRent?.toString() ?? "");

  useEffect(() => {
    setMinText(filter.minRent?.toString() ?? "");
  }, [filter.minRent]);
  useEffect(() => {
    setMaxText(filter.maxRent?.toString() ?? "");
  }, [filter.maxRent]);

  const minRent = numberOrUndefined(minText);
  const maxRent = numberOrUndefined(maxText);
  const error = validatePriceRange(minRent, maxRent);

  const commit = (nextMin: string, nextMax: string) => {
    const min = numberOrUndefined(nextMin);
    const max = numberOrUndefined(nextMax);
    if (validatePriceRange(min, max)) return; // invalid: keep editing, don't apply
    if (min !== filter.minRent || max !== filter.maxRent) {
      onChange({ ...filter, minRent: min, maxRent: max });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Input
          label="Minimum"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Any"
          value={minText}
          aria-invalid={error !== null}
          onChange={(e) => {
            setMinText(e.target.value);
            commit(e.target.value, maxText);
          }}
        />
        <Input
          label="Maximum"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Any"
          value={maxText}
          aria-invalid={error !== null}
          onChange={(e) => {
            setMaxText(e.target.value);
            commit(minText, e.target.value);
          }}
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
