"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props<T extends string> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  /** multiple일 때 최소 선택 수 */
  min?: number;
}

export function ChipGroup<T extends string>({ label, options, value, onChange, multiple = true, min = 0 }: Props<T>) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => {
                if (!multiple) return onChange([o.value]);
                if (on && value.length <= min) return;
                onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value]);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors",
                on ? "bg-ink text-white ring-ink" : "bg-white text-neutral-700 ring-black/10 hover:ring-black/30",
              )}
            >
              {on && multiple && <Check className="size-3.5" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
