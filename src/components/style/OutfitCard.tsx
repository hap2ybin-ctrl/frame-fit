import { Sparkles } from "lucide-react";
import type { BodyType } from "@/lib/classifier/types";
import { TYPE_META } from "@/lib/brand/typeMeta";
import { OCCASION_LABEL } from "@/lib/styling/recommend";
import type { GarmentAttrs, Outfit } from "@/lib/styling/types";
import { cn } from "@/lib/utils";
import { GarmentIcon, OutfitArt } from "./GarmentArt";

const ATTR_LABEL: Record<keyof GarmentAttrs, string> = {
  neckline: "넥라인",
  length: "기장",
  waist: "허리선",
  fit: "핏",
  fabric: "소재",
  pattern: "패턴",
  layering: "레이어드",
};

export function OutfitCard({ outfit, type, index }: { outfit: Outfit; type: BodyType | null; index: number }) {
  const meta = type ? TYPE_META[type] : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-[1.75rem] ring-1 ring-black/5">
      <div className={cn("relative px-6 pt-6", meta ? meta.bgSoft : "bg-surface")}>
        <span className="absolute left-5 top-5 font-display text-xs font-semibold tabular text-neutral-500">
          LOOK {String(index + 1).padStart(2, "0")}
        </span>
        <span className="absolute right-5 top-5 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium">{OCCASION_LABEL[outfit.occasion]}</span>
        <OutfitArt garments={outfit.items.map((i) => i.garment)} className="mx-auto h-56 w-auto" label={`${outfit.concept} 코디 일러스트`} />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h3 className="text-lg font-bold leading-snug">{outfit.title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{outfit.concept}</p>
        </div>
        <p className="flex items-start gap-2 rounded-2xl bg-surface p-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">노리는 효과</span> · {outfit.effect}
          </span>
        </p>
        <ul className="space-y-2">
          {outfit.items.map(({ garment, why, matched }) => (
            <li key={garment.id}>
              <details className="group rounded-2xl ring-1 ring-black/5 open:bg-surface/60">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                  <GarmentIcon garment={garment} className="size-10 shrink-0 rounded-xl bg-white p-1 ring-1 ring-black/5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{garment.name}</span>
                    {matched.length > 0 && (
                      <span className="mt-0.5 block truncate text-xs text-neutral-500">{matched.join(" · ")}</span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400 group-open:hidden">이유</span>
                  <span className="hidden text-xs text-neutral-400 group-open:inline">닫기</span>
                </summary>
                <div className="space-y-2.5 px-3 pb-3 text-sm leading-relaxed">
                  <p>
                    <span className="font-semibold">왜 어울리나요 </span>
                    <span className="text-neutral-700">{why}</span>
                  </p>
                  <p>
                    <span className="font-semibold">노리는 효과 </span>
                    <span className="text-neutral-700">{garment.effect}</span>
                  </p>
                  <p>
                    <span className="font-semibold">원하지 않는다면 </span>
                    <span className="text-neutral-700">{garment.alternative}</span>
                  </p>
                  <dl className="flex flex-wrap gap-1.5 pt-1">
                    {(Object.keys(garment.attrs) as Array<keyof GarmentAttrs>).map((k) => (
                      <div key={k} className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-black/5">
                        <dt className="inline text-neutral-500">{ATTR_LABEL[k]} </dt>
                        <dd className="inline">{garment.attrs[k]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            </li>
          ))}
        </ul>
        {outfit.missing && outfit.missing.length > 0 && (
          <p className="text-xs leading-relaxed text-neutral-500">
            더하면 좋은 아이템: {outfit.missing.map((m) => m.name).join(", ")}
          </p>
        )}
      </div>
    </article>
  );
}
