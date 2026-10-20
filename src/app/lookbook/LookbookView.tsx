"use client";

import Link from "next/link";
import { BookmarkX, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { Notice } from "@/components/flow/Notice";
import { OutfitCard } from "@/components/style/OutfitCard";
import { PersistToggle } from "@/components/style/PersistToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { lookbookKey, removeSavedOutfit, resetPreferences, restoreOutfit, setFitPreference, toggleDislikedGarment } from "@/lib/preferences/model";
import { nowIso, updatePreferences, usePreferences } from "@/lib/preferences/store";
import { GARMENTS } from "@/lib/styling/garments.data";
import { FIT_LABEL, GOAL_LABEL, OCCASION_LABEL, TASTE_LABEL, outfitFromSnapshot } from "@/lib/styling/recommend";
import { fitLabHrefForOutfit } from "@/lib/fitlab/silhouette";
import { useHydrated } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const LINE_LABEL = { women: "여성복", men: "남성복", unisex: "유니섹스" } as const;
const MODE_LABEL = { auto: "분석 결과 사용", straight: "스트레이트", wave: "웨이브", natural: "내추럴", mixed: "혼합형" } as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function LookbookView() {
  const pref = usePreferences();
  const hydrated = useHydrated();

  if (!hydrated) return <div className="mx-auto h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  const saved = pref.lookbook.map((s) => ({ snap: s, outfit: outfitFromSnapshot(s) })).filter((x) => x.outfit);
  const disliked = pref.dislikedGarments.map((id) => GARMENTS.find((g) => g.id === id)).filter((g) => !!g);
  const s = pref.style;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-5 sm:px-8">
      <div className="flex flex-col gap-3 rounded-3xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <PersistToggle />
        <Link href="/style" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}>
          맞춤 코디에서 더 고르기
        </Link>
      </div>

      <section aria-labelledby="saved-outfits">
        <h2 id="saved-outfits" className="text-xl font-bold tracking-tight">
          저장한 코디 <span className="text-neutral-400">{saved.length}</span>
        </h2>
        {saved.length === 0 ? (
          <Notice tone="info" className="mt-4">
            아직 저장한 코디가 없어요. 맞춤 코디 카드의 책갈피 버튼으로 마음에 드는 코디를 저장해 보세요.
          </Notice>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {saved.map(({ snap, outfit }, i) => (
              <div key={lookbookKey(snap)} className="flex flex-col gap-2">
                <p className="px-1 text-xs text-neutral-500">
                  {fmt(snap.savedAt)} 저장 · 기준 {snap.typeLabel}
                </p>
                <OutfitCard
                  outfit={outfit!}
                  type={snap.primary}
                  index={i}
                  actions={{
                    saved: true,
                    onToggleSave: () => updatePreferences((st) => removeSavedOutfit(st, lookbookKey(snap), nowIso())),
                    fitLabHref: fitLabHrefForOutfit(outfit!),
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="taste" className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl p-6 ring-1 ring-black/5">
          <h2 id="taste" className="text-lg font-bold">취향 기록</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ["유형 기준", pref.typeMode === "mixed" ? `혼합형 (${pref.mixedPair.map((t) => MODE_LABEL[t]).join("·")})` : MODE_LABEL[pref.typeMode]],
              ["의류 스타일", LINE_LABEL[s.line]],
              ["상황", s.occasions.map((o) => OCCASION_LABEL[o]).join(", ")],
              ["취향", s.tastes.map((t) => TASTE_LABEL[t]).join(", ") || "선택 안 함"],
              ["원하는 효과", s.goals.map((g) => GOAL_LABEL[g]).join(", ") || "선택 안 함"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-neutral-500">선호 핏</dt>
              <dd className="flex items-center gap-2 font-medium">
                {pref.fitPreference ? FIT_LABEL[pref.fitPreference] : "기록 없음"}
                {pref.fitPreference && (
                  <button
                    type="button"
                    className="text-xs text-neutral-500 underline underline-offset-2"
                    onClick={() => updatePreferences((st) => setFitPreference(st, null, nowIso()))}
                  >
                    지우기
                  </button>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/style" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}>
              취향 수정
            </Link>
            <Link href="/fit-lab" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}>
              실루엣 비교에서 핏 고르기
            </Link>
          </div>
        </div>

        <div className="rounded-3xl p-6 ring-1 ring-black/5">
          <h2 className="text-lg font-bold">덜 추천하는 아이템</h2>
          {disliked.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">코디 카드의 아이템을 펼쳐 &lsquo;이 아이템 덜 추천&rsquo;을 누르면 여기에 모여요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {disliked.map((g) => (
                <li key={g!.id} className="flex items-center justify-between gap-3 text-sm">
                  {g!.name}
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => updatePreferences((st) => toggleDislikedGarment(st, g!.id, nowIso()))}>
                    <Undo2 className="size-3.5" aria-hidden /> 되돌리기
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="excluded" aria-labelledby="excluded-title" className="scroll-mt-24">
        <h2 id="excluded-title" className="text-xl font-bold tracking-tight">
          제외한 코디 <span className="text-neutral-400">{pref.excludedOutfits.length}</span>
        </h2>
        <p className="mt-1 text-sm text-neutral-600">제외한 상의·하의(또는 원피스) 조합은 다음 추천에 나오지 않아요.</p>
        {pref.excludedOutfits.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">제외한 코디가 없어요.</p>
        ) : (
          <ul className="mt-4 divide-y divide-black/5 rounded-2xl ring-1 ring-black/5">
            {pref.excludedOutfits.map((e) => (
              <li key={e.coreKey} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="flex items-center gap-2">
                  <BookmarkX className="size-4 text-neutral-400" aria-hidden />
                  {e.concept}
                  <span className="text-xs text-neutral-400">{fmt(e.excludedAt)}</span>
                </span>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => updatePreferences((st) => restoreOutfit(st, e.coreKey, nowIso()))}>
                  <RotateCcw className="size-3.5" aria-hidden /> 다시 추천받기
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="data" className="rounded-3xl bg-surface p-6">
        <h2 id="data" className="font-semibold">데이터 관리</h2>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">
          취향·코디북은 분석 데이터와 따로 보관돼요. 분석 결과 요약은{" "}
          <Link href="/saved" className="underline underline-offset-2">
            내 결과
          </Link>
          에서, 사진은 이 탭의 세션에서만 관리돼요.
        </p>
        <Button
          variant="ghost"
          className="mt-3 rounded-full text-red-700 hover:bg-red-50"
          onClick={() => {
            if (window.confirm("저장한 코디, 제외 목록, 취향 기록을 모두 지울까요? 되돌릴 수 없어요.")) updatePreferences((st) => resetPreferences(st));
          }}
        >
          <Trash2 className="size-4" aria-hidden /> 취향·코디북 초기화
        </Button>
      </section>
    </div>
  );
}
