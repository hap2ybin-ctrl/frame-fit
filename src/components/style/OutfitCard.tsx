import Link from "next/link";
import { Bookmark, BookmarkCheck, Palette, Ruler, Sparkles, ThumbsDown, X } from "lucide-react";
import type { BodyType } from "@/lib/classifier/types";
import { TYPE_META } from "@/lib/brand/typeMeta";
import { PERSONAL_COLOR, outfitColorNote, type PersonalColor } from "@/lib/styling/personalColor";
import { OCCASION_LABEL } from "@/lib/styling/recommend";
import type { GarmentAttrs, Outfit } from "@/lib/styling/types";
import { cn } from "@/lib/utils";
import { GarmentVisual } from "./GarmentArt";
import { LookSpread } from "./LookSpread";

const ATTR_LABEL: Record<keyof GarmentAttrs, string> = {
  neckline: "넥라인",
  length: "기장",
  waist: "허리선",
  fit: "핏",
  fabric: "소재",
  pattern: "패턴",
  layering: "레이어드",
};

export interface OutfitActions {
  saved?: boolean;
  onToggleSave?: () => void;
  onExclude?: () => void;
  disliked?: (garmentId: string) => boolean;
  onToggleDislike?: (garmentId: string) => void;
  /** 실루엣 비교 화면 링크 (코디에서 핏 조건을 가져옴) */
  fitLabHref?: string;
}

export function OutfitCard({
  outfit,
  type,
  index,
  actions = {},
  personalColor = null,
}: {
  outfit: Outfit;
  type: BodyType | null;
  index: number;
  actions?: OutfitActions;
  /** 사용자가 고른 퍼스널 컬러 (있으면 컬러 메모 표시) */
  personalColor?: PersonalColor | null;
}) {
  const meta = type ? TYPE_META[type] : null;
  const colorNote = personalColor
    ? outfitColorNote(
        outfit.items.map(({ garment: g }) => ({ name: g.name, color: g.color, slot: g.slot })),
        personalColor,
      )
    : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-[1.75rem] ring-1 ring-black/5">
      <div className={cn("px-4 pb-4 pt-3", meta ? meta.bgSoft : "bg-surface")}>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="font-display text-xs font-semibold tabular text-neutral-500">LOOK {String(index + 1).padStart(2, "0")}</span>
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium">{OCCASION_LABEL[outfit.occasion]}</span>
        </div>
        <LookSpread outfit={outfit} />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold leading-snug">{outfit.title}</h3>
            <p className="mt-1 text-sm text-neutral-600">{outfit.concept}</p>
          </div>
          {(actions.onToggleSave || actions.onExclude) && (
            <div className="flex shrink-0 gap-1">
              {actions.onToggleSave && (
                <button
                  type="button"
                  onClick={actions.onToggleSave}
                  aria-pressed={!!actions.saved}
                  aria-label={actions.saved ? "코디북에서 빼기" : "코디북에 저장"}
                  title={actions.saved ? "코디북에서 빼기" : "코디북에 저장"}
                  className={cn(
                    "grid size-9 place-items-center rounded-full ring-1 transition-colors",
                    actions.saved ? "bg-ink text-white ring-ink" : "bg-white text-neutral-600 ring-black/10 hover:ring-black/30",
                  )}
                >
                  {actions.saved ? <BookmarkCheck className="size-4" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
                </button>
              )}
              {actions.onExclude && (
                <button
                  type="button"
                  onClick={actions.onExclude}
                  aria-label="이 코디 제외하고 다른 코디 보기"
                  title="이 코디 제외"
                  className="grid size-9 place-items-center rounded-full bg-white text-neutral-500 ring-1 ring-black/10 transition-colors hover:text-red-700 hover:ring-red-200"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-2xl bg-surface p-4 text-sm leading-relaxed">
          <p className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">추천 이유 </span>
              <span className="text-neutral-700">{outfit.reason}</span>
            </span>
          </p>
          <p className="pl-6 text-neutral-600">노리는 효과 · {outfit.effect}</p>
        </div>

        {colorNote && personalColor && (
          <div className="text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-semibold">
              <Palette className="size-4" aria-hidden /> {PERSONAL_COLOR[personalColor].label} 컬러 메모
            </p>
            <ul className="mt-2 space-y-1.5 text-neutral-700">
              {colorNote.good.length > 0 && (
                <li className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                  잘 맞는 컬러: {colorNote.good.join(", ")}
                </li>
              )}
              {colorNote.caution.map((c) => (
                <li key={c.name} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                  <span>
                    {c.name}: {c.tip}
                  </span>
                </li>
              ))}
              <li className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                {colorNote.accessory}
              </li>
            </ul>
          </div>
        )}

        {outfit.fitTips.length > 0 && (
          <div className="text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-semibold">
              <Ruler className="size-4" aria-hidden /> 핏 조절 방법
            </p>
            <ul className="mt-2 space-y-1.5 text-neutral-700">
              {outfit.fitTips.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                  {t}
                </li>
              ))}
            </ul>
            {actions.fitLabHref && (
              <Link href={actions.fitLabHref} className="mt-2 inline-block text-xs font-medium underline underline-offset-2">
                실루엣 비교에서 핏 차이 보기
              </Link>
            )}
          </div>
        )}

        <ul className="space-y-2">
          {outfit.items.map(({ garment, why, matched }) => {
            const disliked = actions.disliked?.(garment.id) ?? false;
            return (
              <li key={garment.id}>
                <details className={cn("group rounded-2xl ring-1 ring-black/5 open:bg-surface/60", disliked && "opacity-60")}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
                    <GarmentVisual garment={garment} className="size-11 shrink-0 rounded-xl bg-white ring-1 ring-black/5" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{garment.name}</span>
                      {(matched.length > 0 || disliked) && (
                        <span className="mt-0.5 block truncate text-xs text-neutral-500">{disliked ? "덜 추천으로 표시됨" : matched.join(" · ")}</span>
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
                    {actions.onToggleDislike && (
                      <button
                        type="button"
                        onClick={() => actions.onToggleDislike?.(garment.id)}
                        aria-pressed={disliked}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-neutral-600 ring-1 ring-black/10 hover:ring-black/30"
                      >
                        <ThumbsDown className="size-3.5" aria-hidden /> {disliked ? "덜 추천 해제" : "이 아이템 덜 추천"}
                      </button>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        {outfit.missing && outfit.missing.length > 0 && (
          <p className="text-xs leading-relaxed text-neutral-500">더하면 좋은 아이템: {outfit.missing.map((m) => m.name).join(", ")}</p>
        )}
      </div>
    </article>
  );
}
