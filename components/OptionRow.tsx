"use client";

type OptionRowOption<T> = {
  value: T;
  label: string;
};

type OptionRowProps<T> = {
  options: OptionRowOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
};

/**
 * A segmented row of mutually-exclusive buttons — e.g. Studio/1/2/3/4/5 for
 * bedrooms, or Any/1+/2+/3+/4+ for bathrooms. Dumb: it renders `options` and
 * reports whichever one was clicked verbatim. The caller decides what
 * clicking the already-selected option should do (toggle back to "Any", or
 * leave it selected) — bedrooms and bathrooms want different behavior here,
 * so that decision doesn't belong in this shared component.
 */
export function OptionRow<T>({ options, value, onChange }: OptionRowProps<T>) {
  return (
    <div className="inline-flex flex-wrap overflow-hidden rounded-lg border border-gray-300">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={index}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-w-11 border-r border-gray-300 px-3 py-2 text-sm font-medium last:border-r-0 ${
              selected ? "bg-black text-white" : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
