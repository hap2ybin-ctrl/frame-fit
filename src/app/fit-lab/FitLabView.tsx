"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, FlaskConical, Heart, Wand2 } from "lucide-react";
import { SilhouetteFigure } from "@/components/fitlab/SilhouetteFigure";
import { Notice } from "@/components/flow/Notice";
import { ChipGroup } from "@/components/style/ChipGroup";
import { Button, buttonVariants } from "@/components/ui/button";
import { TYPE_META } from "@/lib/brand/typeMeta";
import type { BodyType } from "@/lib/classifier/types";
import {
  BOTTOM_LABEL,
  OUTER_LABEL,
  TOP_LENGTH_LABEL,
  WAIST_LABEL,
  computeSilhouette,
  parseFitLabQuery,
  type BottomShape,
  type FitLabParams,
  type OuterKind,
  type TopLength,
  type WaistLine,
} from "@/lib/fitlab/silhouette";
import { setFitPreference } from "@/lib/preferences/model";
import { nowIso, updatePreferences, usePreferences } from "@/lib/preferences/store";
import { FIT_LABEL, resolveTypeContext } from "@/lib/styling/recommend";
import { STYLE_POINTS } from "@/lib/styling/stylePoints.data";
import type { FitClass } from "@/lib/styling/types";
import { useSavedResults } from "@/lib/store/saved";
import { useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const FITS: FitClass[] = ["slim", "regular", "over"];
const opts = <T extends string>(rec: Record<T, string>) => (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));

/** 유형 가이드의 일반적인 방향을 도해 조건으로 옮긴 예시 (검증된 정답이 아님) */
const TYPE_PRESET: Record<BodyType, { params: FitLabParams; fit: FitClass }> = {
  straight: { params: { topLength: "hip", waistLine: "natural", bottom: "straight", outer: "short" }, fit: "regular" },
  wave: { params: { topLength: "crop", waistLine: "high", bottom: "tapered", outer: "none" }, fit: "slim" },
  natural: { params: { topLength: "long", waistLine: "untucked", bottom: "wide", outer: "long" }, fit: "over" },
};

const FIT_NOTE: Record<FitClass, string> = {
  slim: "몸선을 따라 떨어져 실루엣이 가장 작고 선명해요.",
  regular: "적당한 여유로 몸선과 옷의 형태가 균형을 이뤄요.",
  over: "어깨가 떨어지고 폭이 넓어져 옷의 형태가 실루엣을 만들어요.",
};

export function FitLabView() {
  const search = useSearchParams();
  const initial = useMemo(() => parseFitLabQuery((k) => search.get(k)), [search]);
  const [params, setParams] = useState<FitLabParams>(initial.params);
  const [focus, setFocus] = useState<FitClass | null>(initial.focus);
  const pref = usePreferences();
  const session = useSession();
  const saved = useSavedResults();
  const hydrated = useHydrated();

  const latest = saved[0];
  const ctx = resolveTypeContext(
    pref.typeMode,
    pref.mixedPair,
    session.result,
    latest ? { classification: latest.classification, primary: latest.primary, secondary: latest.secondary } : null,
  );
  const type = ctx.result?.primary && ctx.result.classification !== "inconclusive" ? ctx.result.primary : null;
  const sils = useMemo(() => FITS.map((f) => ({ fit: f, sil: computeSilhouette(f, params) })), [params]);
  const set = <K extends keyof FitLabParams>(k: K, v: FitLabParams[K]) => setParams((p) => ({ ...p, [k]: v }));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Notice tone="info" title="시뮬레이션 도해예요">
        고정된 표준 도식 위에 옷의 형태만 바꿔 그린 그림이에요. 사용자의 실제 신체를 측정하거나 변형하지 않으며, 표시되는 비율도 도해 기준이에요.
      </Notice>

      <section aria-label="비교 조건" className="mt-6 grid gap-6 rounded-[1.75rem] bg-surface p-6 sm:p-8 md:grid-cols-2">
        <ChipGroup<TopLength> label="상의 길이" options={opts(TOP_LENGTH_LABEL)} value={[params.topLength]} multiple={false} onChange={([v]) => set("topLength", v)} />
        <ChipGroup<WaistLine> label="허리선" options={opts(WAIST_LABEL)} value={[params.waistLine]} multiple={false} onChange={([v]) => set("waistLine", v)} />
        <ChipGroup<BottomShape> label="하의 형태" options={opts(BOTTOM_LABEL)} value={[params.bottom]} multiple={false} onChange={([v]) => set("bottom", v)} />
        <ChipGroup<OuterKind> label="아우터" options={opts(OUTER_LABEL)} value={[params.outer]} multiple={false} onChange={([v]) => set("outer", v)} />
        {params.waistLine !== "untucked" && (
          <p className="text-xs text-neutral-500 md:col-span-2">넣어 입기를 고르면 상의 길이 대신 허리선 위치가 상하 경계가 돼요.</p>
        )}
      </section>

      {hydrated && type && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium", TYPE_META[type].bgSoft, TYPE_META[type].text)}>
            <span className={cn("size-2 rounded-full", TYPE_META[type].bg)} aria-hidden />
            {ctx.label}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setParams(TYPE_PRESET[type].params);
              setFocus(TYPE_PRESET[type].fit);
            }}
          >
            <Wand2 className="size-3.5" aria-hidden /> {TYPE_META[type].label} 가이드 예시 적용
          </Button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-5" role="list" aria-label="핏별 실루엣">
        {sils.map(({ fit, sil }) => {
          const preferred = pref.fitPreference === fit;
          return (
            <article
              key={fit}
              role="listitem"
              className={cn(
                "flex flex-col rounded-[1.5rem] p-2 ring-1 transition-shadow sm:p-4",
                focus === fit ? "ring-2 ring-ink" : "ring-black/5",
              )}
            >
              <div className="flex items-center justify-between gap-1 px-1">
                <h2 className="text-sm font-bold sm:text-base">{FIT_LABEL[fit]}</h2>
                {preferred && <Heart className="size-3.5 fill-current text-straight" aria-label="선호 핏" />}
              </div>
              <button type="button" onClick={() => setFocus(fit)} className="mt-1 rounded-xl bg-surface/60" aria-label={`${FIT_LABEL[fit]} 강조해서 보기`}>
                <SilhouetteFigure sil={sil} label={`${FIT_LABEL[fit]}, ${TOP_LENGTH_LABEL[params.topLength]} 상의, ${WAIST_LABEL[params.waistLine]}, ${BOTTOM_LABEL[params.bottom]} 시뮬레이션 도해`} />
              </button>
              <dl className="mt-2 space-y-1 px-1 text-[11px] leading-snug text-neutral-600 sm:text-xs">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:gap-1">
                  <dt>상 : 하 (도해)</dt>
                  <dd className="whitespace-nowrap font-display font-semibold tabular text-ink">
                    {sil.split.upper} : {sil.split.lower}
                  </dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:gap-1">
                  <dt>가장 넓은 폭</dt>
                  <dd className="font-display tabular">{Math.round(sil.maxWidth)}</dd>
                </div>
              </dl>
              <p className="mt-2 hidden px-1 text-xs leading-relaxed text-neutral-600 sm:block">{FIT_NOTE[fit]}</p>
              <Button
                variant={preferred ? "default" : "outline"}
                size="sm"
                className="mt-auto rounded-full text-[11px] sm:text-xs"
                onClick={() => updatePreferences((s) => setFitPreference(s, preferred ? null : fit, nowIso()))}
                aria-pressed={preferred}
              >
                {preferred ? <Check className="size-3.5" aria-hidden /> : <Heart className="size-3.5" aria-hidden />}
                {preferred ? "선호 핏" : "이 핏 선호"}
              </Button>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        분홍 점선은 상의(또는 넣어 입은 허리선)가 끝나는 시각적 경계예요. &lsquo;상 : 하&rsquo;는 머리 끝~경계와 경계~바닥의 도해상 길이 비율로, 실제 신체 치수가
        아니에요. 선호 핏은 코디 추천에서 해당 핏 아이템을 조금 더 추천하는 데 쓰여요.
      </p>

      {hydrated && type && (
        <section aria-labelledby="fit-guide" className="mt-10">
          <h2 id="fit-guide" className="flex items-center gap-2 text-lg font-bold">
            <FlaskConical className="size-4" aria-hidden /> {TYPE_META[type].label} 경향 참고 가이드
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {STYLE_POINTS[type]
              .filter((p) => p.aspect === "length" || p.aspect === "waist" || p.aspect === "pants")
              .map((p) => (
                <div key={p.aspect} className="rounded-2xl p-4 text-sm ring-1 ring-black/5">
                  <p className={cn("text-xs font-semibold", TYPE_META[type].text)}>{p.label}</p>
                  <p className="mt-1 font-semibold">{p.recommendation}</p>
                  <p className="mt-1 text-neutral-600">{p.why}</p>
                  <p className="mt-1 text-xs text-neutral-500">원하지 않는다면 · {p.alternative}</p>
                </div>
              ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex flex-wrap justify-between gap-3">
        <Link href="/style" className={cn(buttonVariants({ variant: "ghost" }), "h-11 rounded-full")}>
          맞춤 코디로 돌아가기
        </Link>
        <Link href="/lookbook" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full")}>
          코디북 보기
        </Link>
      </div>
    </div>
  );
}
