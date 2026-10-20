"use client";

import { TYPE_META } from "@/lib/brand/typeMeta";
import type { BodyType } from "@/lib/classifier/types";
import type { TypeContext } from "@/lib/styling/recommend";
import type { TypeMode } from "@/lib/styling/types";
import { cn } from "@/lib/utils";

const MODES: Array<{ value: TypeMode; label: string }> = [
  { value: "auto", label: "분석 결과 사용" },
  { value: "straight", label: "스트레이트" },
  { value: "wave", label: "웨이브" },
  { value: "natural", label: "내추럴" },
  { value: "mixed", label: "혼합형" },
];
const TYPES: BodyType[] = ["straight", "wave", "natural"];

export function TypePicker({
  mode,
  pair,
  context,
  onChange,
}: {
  mode: TypeMode;
  pair: [BodyType, BodyType];
  context: TypeContext;
  onChange: (mode: TypeMode, pair?: [BodyType, BodyType]) => void;
}) {
  function togglePair(t: BodyType) {
    if (pair.includes(t)) return;
    // 가장 먼저 고른 쪽을 밀어내고 새 유형을 추가
    onChange("mixed", [pair[1], t]);
  }
  return (
    <fieldset>
      <legend className="text-sm font-semibold">골격 유형 기준</legend>
      <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label="골격 유형 기준">
        {MODES.map((m) => {
          const on = mode === m.value;
          const meta = m.value !== "auto" && m.value !== "mixed" ? TYPE_META[m.value] : null;
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors",
                on ? "bg-ink text-white ring-ink" : "bg-white text-neutral-700 ring-black/10 hover:ring-black/30",
              )}
            >
              {meta && <span className={cn("size-2 rounded-full", meta.bg)} aria-hidden />}
              {m.label}
            </button>
          );
        })}
      </div>
      {mode === "mixed" && (
        <div className="mt-3">
          <p className="text-xs text-neutral-500">섞을 두 유형을 골라 주세요</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const on = pair.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => togglePair(t)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1",
                    on ? `${TYPE_META[t].bgSoft} ${TYPE_META[t].text} ring-transparent font-semibold` : "bg-white text-neutral-600 ring-black/10",
                  )}
                >
                  <span className={cn("size-2 rounded-full", TYPE_META[t].bg)} aria-hidden />
                  {TYPE_META[t].label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        현재 기준: <span className="font-medium text-neutral-700">{context.label}</span>
        {mode === "auto" && context.source === "none" && " · 분석 결과가 없어 선택한 조건만으로 추천해요"}
        {mode !== "auto" && " · 직접 고른 유형은 분석 결과와 별개인 취향 설정으로만 쓰여요"}
      </p>
    </fieldset>
  );
}
