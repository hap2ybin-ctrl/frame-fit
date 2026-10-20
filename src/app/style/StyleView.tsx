"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Shirt, Sparkles, SwatchBook } from "lucide-react";
import { Notice } from "@/components/flow/Notice";
import { ChipGroup } from "@/components/style/ChipGroup";
import { GarmentIcon } from "@/components/style/GarmentArt";
import { OutfitCard } from "@/components/style/OutfitCard";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLASSIFICATION_LABEL, TYPE_META } from "@/lib/brand/typeMeta";
import { CLOSET_GROUPS } from "@/lib/styling/garments.data";
import {
  FOCUS_LABEL,
  GOAL_LABEL,
  OCCASION_LABEL,
  TASTE_LABEL,
  recommendFromCloset,
  recommendOutfits,
  stylePointsFor,
} from "@/lib/styling/recommend";
import type { FocusArea, Occasion, SilhouetteGoal, StyleLine, StylePreferences, Taste } from "@/lib/styling/types";
import { updateSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const opts = <T extends string>(rec: Record<T, string>) => (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));
const LINE_OPTIONS: Array<{ value: StyleLine; label: string }> = [
  { value: "women", label: "여성 스타일" },
  { value: "men", label: "남성 스타일" },
  { value: "unisex", label: "유니섹스" },
];

export function StyleView() {
  const session = useSession();
  const hydrated = useHydrated();
  const { prefs, closet, result } = session;

  const setPrefs = (patch: Partial<StylePreferences>) => updateSession((s) => ({ ...s, prefs: { ...s.prefs, ...patch } }));
  const toggleCloset = (key: string) =>
    updateSession((s) => ({ ...s, closet: s.closet.includes(key) ? s.closet.filter((k) => k !== key) : [...s.closet, key] }));

  const outfits = useMemo(() => recommendOutfits({ result, prefs }), [result, prefs]);
  const closetRec = useMemo(() => recommendFromCloset({ result, prefs, closet }), [result, prefs, closet]);
  const points = stylePointsFor(result);

  if (!hydrated) return <div className="mx-auto h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  const cardType = result && result.classification !== "inconclusive" ? result.primary : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      {!result ? (
        <Notice tone="info" title="유형 결과 없이 보고 있어요" className="mb-6">
          아직 분석 결과가 없어 선택한 실루엣·취향만으로 추천해요.{" "}
          <Link href="/guide" className="underline underline-offset-2">분석 시작하기</Link>
        </Notice>
      ) : (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-500">기준 결과</span>
          <span className={cn("rounded-full px-3 py-1 font-medium", cardType ? `${TYPE_META[cardType].bgSoft} ${TYPE_META[cardType].text}` : "bg-surface")}>
            {result.classification === "mixed" && result.primary && result.secondary
              ? `${TYPE_META[result.primary].label} × ${TYPE_META[result.secondary].label} 혼합형`
              : CLASSIFICATION_LABEL[result.classification]}
          </span>
          {result.classification === "inconclusive" && <span className="text-neutral-500">· 유형 가중치 없이 선호 조건으로만 추천해요</span>}
        </div>
      )}

      <section aria-label="스타일 조건" className="grid gap-6 rounded-[1.75rem] bg-surface p-6 sm:p-8 md:grid-cols-2">
        <ChipGroup label="스타일 라인" options={LINE_OPTIONS} value={[prefs.line]} multiple={false} onChange={([v]) => setPrefs({ line: v })} />
        <ChipGroup<Occasion> label="상황 (1개 이상)" options={opts(OCCASION_LABEL)} value={prefs.occasions} min={1} onChange={(v) => setPrefs({ occasions: v })} />
        <ChipGroup<SilhouetteGoal> label="원하는 실루엣" options={opts(GOAL_LABEL)} value={prefs.goals} onChange={(v) => setPrefs({ goals: v })} />
        <ChipGroup<FocusArea> label="강조하고 싶은 부위" options={opts(FOCUS_LABEL)} value={prefs.focus} onChange={(v) => setPrefs({ focus: v })} />
        <div className="md:col-span-2">
          <ChipGroup<Taste> label="스타일 취향" options={opts(TASTE_LABEL)} value={prefs.tastes} onChange={(v) => setPrefs({ tastes: v })} />
        </div>
      </section>

      <Tabs defaultValue="outfits" className="mt-10">
        <TabsList className="h-11! w-full rounded-full p-1 sm:w-fit">
          <TabsTrigger value="outfits" className="min-w-0 rounded-full px-2 text-[13px] sm:px-4 sm:text-sm">
            <Sparkles aria-hidden /> 추천 코디
          </TabsTrigger>
          <TabsTrigger value="closet" className="min-w-0 rounded-full px-2 text-[13px] sm:px-4 sm:text-sm">
            <Shirt aria-hidden /> 내 옷장 조합
          </TabsTrigger>
          <TabsTrigger value="points" className="min-w-0 rounded-full px-2 text-[13px] sm:px-4 sm:text-sm">
            <SwatchBook aria-hidden /> 스타일 포인트
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outfits" className="mt-6">
          {outfits.length === 0 ? (
            <Notice tone="warn">선택한 조건에 맞는 조합을 찾지 못했어요. 스타일 라인이나 상황을 바꿔 보세요.</Notice>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {outfits.map((o, i) => (
                <OutfitCard key={o.id} outfit={o} type={cardType} index={i} />
              ))}
            </div>
          )}
          <p className="mt-6 text-xs leading-relaxed text-neutral-500">
            추천은 의복 카탈로그 데이터의 유형별 어울림 값과 선택한 조건을 규칙으로 조합한 결과예요. 어울림 값은 일반적인 스타일링 가이드를 단순화한
            초기값이며 검증된 수치가 아니에요.
          </p>
        </TabsContent>

        <TabsContent value="closet" className="mt-6 space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CLOSET_GROUPS.map((g) => (
              <fieldset key={g.label}>
                <legend className="text-sm font-semibold">{g.label}</legend>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {g.items.map((it) => {
                    const on = closet.includes(it.key);
                    return (
                      <button
                        key={it.key}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggleCloset(it.key)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm ring-1 transition-colors",
                          on ? "bg-ink text-white ring-ink" : "bg-white text-neutral-700 ring-black/10 hover:ring-black/30",
                        )}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <p className="text-xs text-neutral-500">옷장 체크는 이 탭의 세션에만 보관돼요. 결과를 저장하면 함께 저장돼요.</p>

          {closet.length === 0 ? (
            <Notice tone="info">가지고 있는 옷 종류를 체크하면 그 안에서 조합을 만들어 드려요.</Notice>
          ) : closetRec.outfits.length === 0 ? (
            <Notice tone="warn" title="조합을 만들기에 아이템이 부족해요">
              {closetRec.missingSlots.includes("top") && "상의(또는 원피스)"}
              {closetRec.missingSlots.includes("top") && closetRec.missingSlots.includes("bottom") && "와 "}
              {closetRec.missingSlots.includes("bottom") && "하의(또는 원피스)"}를 하나 이상 체크해 주세요. 선택한 스타일 라인에 맞지 않는 아이템은
              제외돼요.
            </Notice>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {closetRec.outfits.map((o, i) => (
                <OutfitCard key={o.id} outfit={o} type={cardType} index={i} />
              ))}
            </div>
          )}

          {closet.length > 0 && closetRec.suggestions.length > 0 && (
            <section aria-labelledby="add-items">
              <h3 id="add-items" className="font-semibold">하나만 더한다면</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {closetRec.suggestions.map((g) => (
                  <li key={g.id} className="flex gap-3 rounded-2xl p-4 ring-1 ring-black/5">
                    <GarmentIcon garment={g} className="size-12 shrink-0 rounded-xl bg-surface p-1" />
                    <div className="text-sm">
                      <p className="font-medium">{g.name}</p>
                      <p className="mt-0.5 text-neutral-600">{g.effect}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-neutral-500">쇼핑 링크 연동은 아직 제공하지 않아요 (향후 계획).</p>
            </section>
          )}
        </TabsContent>

        <TabsContent value="points" className="mt-6">
          {!points.type && (
            <Notice tone="info" className="mb-5">
              유형 판정이 보류되어 일반 가이드를 보여 드려요. 자가 체크 응답을 늘리면 유형별 포인트를 볼 수 있어요.
            </Notice>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {points.points.map((p) => (
              <article key={p.aspect} className="rounded-3xl p-6 ring-1 ring-black/5">
                <p className={cn("text-xs font-semibold", points.type ? TYPE_META[points.type].text : "text-neutral-500")}>{p.label}</p>
                <h3 className="mt-2 text-lg font-bold leading-snug">{p.recommendation}</h3>
                <dl className="mt-4 space-y-2 text-sm leading-relaxed">
                  <div>
                    <dt className="inline font-semibold">왜 어울리나요 </dt>
                    <dd className="inline text-neutral-700">{p.why}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">노리는 효과 </dt>
                    <dd className="inline text-neutral-700">{p.effect}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">원하지 않는다면 </dt>
                    <dd className="inline text-neutral-700">{p.alternative}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 flex flex-wrap justify-between gap-3">
        <Link href="/result" className={cn(buttonVariants({ variant: "ghost" }), "h-11 rounded-full")}>결과로 돌아가기</Link>
        <Link href="/saved" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full")}>저장된 결과 관리</Link>
      </div>
    </div>
  );
}
