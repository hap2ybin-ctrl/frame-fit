"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ImageOff, Trash2 } from "lucide-react";
import { Notice } from "@/components/flow/Notice";
import { AutoRecordToggle } from "@/components/result/AutoRecordToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { CLASSIFICATION_LABEL, STRENGTH_LABEL, TYPE_META } from "@/lib/brand/typeMeta";
import { describeMixed } from "@/lib/classifier/engine";
import { OCCASION_LABEL } from "@/lib/styling/recommend";
import { deleteAllSaved, deleteSaved, deleteSavedPhotos, openRecordInSession, useSavedResults, type SavedResult } from "@/lib/store/saved";
import { clearSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

/** 혼합형 저장 결과: 어느 쪽에 더 가까운지 한 줄 요약 */
function mixedNote(r: SavedResult): string {
  if (r.classification !== "mixed" || !r.primary || !r.secondary) return "";
  const l = describeMixed(r.scores, r.primary, r.secondary);
  return l.closer ? ` · ${TYPE_META[l.closer].label} 쪽에 조금 더 가까움` : " · 두 유형 동점";
}

export function SavedView() {
  const saved = useSavedResults();
  const session = useSession();
  const hydrated = useHydrated();
  const router = useRouter();
  const [openError, setOpenError] = useState<string | null>(null);

  async function reopen(id: string) {
    setOpenError(null);
    if (session.result && !window.confirm("지금 탭의 세션 데이터(사진·결과)를 이 기록으로 바꿔서 열까요?")) return;
    if (await openRecordInSession(id)) router.push("/result");
    else setOpenError("이 기록의 상세 데이터를 불러오지 못했어요. 요약만 남아 있는 기록일 수 있어요.");
  }

  if (!hydrated) return <div className="mx-auto h-64 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  const sessionItems = [
    session.captures.front && "정면 사진",
    session.captures.side && "측면 사진",
    Object.keys(session.analyses).length > 0 && "분석 데이터(관절 좌표 포함)",
    session.answers.length > 0 && "자가 체크 응답",
    session.result && "현재 결과",
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 sm:px-8">
      <section aria-labelledby="session-data" className="rounded-3xl bg-surface p-6 sm:p-8">
        <h2 id="session-data" className="text-lg font-semibold">이 탭의 세션 데이터</h2>
        <p className="mt-1 text-sm text-neutral-600">탭을 닫으면 자동으로 사라져요.</p>
        {sessionItems.length ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{sessionItems.join(" · ")}</p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                if (window.confirm("세션의 사진, 분석 데이터, 응답, 결과를 모두 지울까요?")) clearSession();
              }}
            >
              <Trash2 className="size-4" aria-hidden /> 지금 모두 지우기
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">보관 중인 세션 데이터가 없어요.</p>
        )}
      </section>

      <section aria-labelledby="saved-list">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="saved-list" className="text-lg font-semibold">
            검사 기록 <span className="text-neutral-400">{saved.length}</span>
          </h2>
          {saved.length > 0 && (
            <Button
              variant="ghost"
              className="rounded-full text-red-700 hover:bg-red-50"
              onClick={() => {
                if (window.confirm("검사 기록을 모두 삭제할까요? 되돌릴 수 없어요.")) deleteAllSaved();
              }}
            >
              <Trash2 className="size-4" aria-hidden /> 전체 삭제
            </Button>
          )}
        </div>
        <AutoRecordToggle className="mt-4 rounded-2xl bg-surface p-4" />
        {openError && (
          <Notice tone="error" className="mt-4">
            {openError}
          </Notice>
        )}
        {saved.length === 0 ? (
          <div className="mt-4 space-y-3">
            <Notice tone="info">아직 검사 기록이 없어요. 검사를 마치면 결과 요약이 여기에 쌓여요.</Notice>
            <Link href="/guide" className={cn(buttonVariants(), "rounded-full")}>분석 시작하기</Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {saved.map((r) => {
              const p = r.primary && r.classification !== "inconclusive" ? TYPE_META[r.primary] : null;
              return (
                <li key={r.id} className={cn("rounded-3xl p-6", p ? p.bgSoft : "bg-surface")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-neutral-500">
                        {new Date(r.savedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <p className="mt-2 text-2xl font-bold">
                        {r.classification === "mixed" && r.primary && r.secondary
                          ? `${TYPE_META[r.primary].label} × ${TYPE_META[r.secondary].label}`
                          : CLASSIFICATION_LABEL[r.classification]}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {STRENGTH_LABEL[r.strength]}
                        {r.secondary && r.classification !== "mixed" && ` · 두 번째 ${TYPE_META[r.secondary].label}`}
                        {mixedNote(r)}
                        {` · 상황 ${r.prefs.occasions.map((o) => OCCASION_LABEL[o]).join(", ")}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="이 기록 삭제"
                      onClick={() => deleteSaved(r.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                  {r.detail && (
                    <p className="mt-3 text-xs text-neutral-500">
                      기록: 결과 요약{r.detail.analysis && " · 관절 좌표·측정값"}
                      {r.detail.photos.length > 0 && ` · 사진(${r.detail.photos.map((v) => (v === "front" ? "정면" : "측면")).join("·")})`}
                    </p>
                  )}
                  {r.detail && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" className="rounded-full" onClick={() => reopen(r.id)}>
                        <Eye className="size-3.5" aria-hidden /> 결과 다시 보기
                      </Button>
                      {r.detail.photos.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            if (window.confirm("이 기록의 사진만 지울까요? 좌표와 결과 요약은 남아요.")) void deleteSavedPhotos(r.id);
                          }}
                        >
                          <ImageOff className="size-3.5" aria-hidden /> 사진만 삭제
                        </Button>
                      )}
                    </div>
                  )}
                  {r.highlights.length > 0 && (
                    <details className="mt-4 text-sm">
                      <summary className="cursor-pointer font-medium">근거 요약 보기</summary>
                      <ul className="mt-2 space-y-1 text-neutral-700">
                        {r.highlights.map((h) => (
                          <li key={h}>· {h}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
