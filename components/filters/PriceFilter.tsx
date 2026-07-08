"use client";

import { useEffect, useState } from "react";
import { validatePriceRange } from "@/lib/priceValidation";
import { Input } from "@/components/ui/Input";
import type { FilterBodyProps } from "@/components/filters/filterOptions";

function numberOrUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
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
          type="number"
          min={0}
          step={100}
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
          type="number"
          min={0}
          step={100}
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
