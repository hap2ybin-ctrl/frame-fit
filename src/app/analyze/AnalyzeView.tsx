"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle, Loader2, RefreshCw, X } from "lucide-react";
import { QualityBadge, QualityList } from "@/components/camera/QualityPanel";
import { Notice } from "@/components/flow/Notice";
import { AnalysisFigure } from "@/components/result/AnalysisFigure";
import { Button, buttonVariants } from "@/components/ui/button";
import { analyzePhoto, type AnalysisStep, type PhotoAnalysis } from "@/lib/analysis/analyzePhoto";
import { NOT_OBSERVABLE } from "@/lib/analysis/features";
import type { CaptureView } from "@/lib/pose/quality";
import { updateSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "active" | "done" | "failed";
const VIEW_LABEL: Record<CaptureView, string> = { front: "정면", side: "측면" };

export function AnalyzeView() {
  const session = useSession();
  const hydrated = useHydrated();
  const [current, setCurrent] = useState<{ view: CaptureView; step: AnalysisStep } | null>(null);
  const runningRef = useRef(false);

  const views = (["front", "side"] as CaptureView[]).filter((v) => session.captures[v]);

  useEffect(() => {
    if (!hydrated || runningRef.current) return;
    const todo = (["front", "side"] as CaptureView[]).filter((v) => session.captures[v] && !session.analyses[v]);
    if (!todo.length) return;
    runningRef.current = true;
    (async () => {
      for (const v of todo) {
        const photo = session.captures[v];
        if (!photo) continue;
        const result = await analyzePhoto(photo, v, (step) => setCurrent({ view: v, step }));
        updateSession((s) => (s.captures[v] === photo ? { ...s, analyses: { ...s.analyses, [v]: result }, result: null } : s));
      }
      setCurrent(null);
      runningRef.current = false;
    })();
  }, [hydrated, session.captures, session.analyses]);

  function rerun() {
    updateSession((s) => ({ ...s, analyses: {}, result: null }));
  }

  if (!hydrated) return <div className="mx-auto h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  if (!session.captures.front) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-5 sm:px-8">
        <Notice tone="info" title="분석할 정면 사진이 없어요">
          먼저 정면 전신 사진을 촬영하거나 업로드해 주세요. 사진 없이 자가 체크만으로도 진행할 수 있어요.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Link href="/capture" className={cn(buttonVariants(), "rounded-full")}>촬영하러 가기</Link>
          <Link href="/check" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>자가 체크만 하기</Link>
        </div>
      </div>
    );
  }

  const busy = current !== null || views.some((v) => !session.analyses[v]);
  const front = session.analyses.front;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <Progress views={views} analyses={session.analyses} current={current} />

      <div className="mt-8 space-y-14">
        {views.map((v) => (
          <ViewSection key={v} view={v} photoUrl={session.captures[v]!.dataUrl} analysis={session.analyses[v]} />
        ))}
      </div>

      <section className="mt-14 rounded-3xl bg-surface p-6 sm:p-8" aria-labelledby="not-observable">
        <h2 id="not-observable" className="text-lg font-semibold">사진으로 추정하지 않는 항목</h2>
        <p className="mt-1 text-sm text-neutral-600">아래 항목은 다음 단계의 자가 체크로 보완해요.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {NOT_OBSERVABLE.map((n) => (
            <li key={n.label} className="rounded-2xl bg-white p-4 text-sm ring-1 ring-black/5">
              <p className="font-medium">{n.label}</p>
              <p className="mt-1 text-neutral-600">{n.reason}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" className="h-11 rounded-full" onClick={rerun} disabled={busy}>
          <RefreshCw className="size-4" aria-hidden /> 다시 분석
        </Button>
        <Link
          href="/check"
          aria-disabled={busy}
          className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base", busy && "pointer-events-none opacity-50")}
        >
          {front?.status === "ok" ? "보완 체크로 이동" : "자가 체크로 계속하기"} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function Progress({
  views,
  analyses,
  current,
}: {
  views: CaptureView[];
  analyses: Partial<Record<CaptureView, PhotoAnalysis>>;
  current: { view: CaptureView; step: AnalysisStep } | null;
}) {
  const order: AnalysisStep[] = ["detect", "quality", "features"];
  const anyLoaded = Object.values(analyses).some((a) => a?.delegate);
  const modelFailed = Object.values(analyses).some((a) => a?.status === "error" && !a.delegate);
  const steps: Array<{ key: string; label: string; status: StepStatus }> = [
    {
      key: "model",
      label: "분석 엔진·모델 준비",
      status: modelFailed ? "failed" : anyLoaded || (current && current.step !== "model") ? "done" : current?.step === "model" ? "active" : "pending",
    },
  ];
  for (const v of views) {
    const a = analyses[v];
    const labels: Record<string, string> = {
      detect: `${VIEW_LABEL[v]} 포즈 감지`,
      quality: `${VIEW_LABEL[v]} 촬영 품질 점검`,
      features: v === "front" ? "정면 비율·윤곽 계산" : "측면 윤곽 계산",
    };
    for (const s of order) {
      let status: StepStatus = "pending";
      if (a) {
        if (a.status === "ok") status = "done";
        else if (a.status === "error") status = s === "detect" && a.delegate ? "failed" : "pending";
        else status = s === "detect" ? "done" : s === "quality" ? "failed" : "pending";
      } else if (current?.view === v) {
        const ci = order.indexOf(current.step as (typeof order)[number]);
        const si = order.indexOf(s);
        status = current.step === "done" || si < ci ? "done" : si === ci ? "active" : "pending";
      }
      steps.push({ key: `${v}:${s}`, label: labels[s], status });
    }
  }
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="분석 진행 상태">
      {steps.map((s) => (
        <li
          key={s.key}
          className={cn(
            "flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm ring-1 transition-colors",
            s.status === "active" ? "bg-ink text-white ring-ink" : s.status === "failed" ? "bg-red-50 text-red-900 ring-red-200" : "bg-white ring-black/5",
            s.status === "pending" && "text-neutral-400",
          )}
          aria-current={s.status === "active" ? "step" : undefined}
        >
          {s.status === "done" ? (
            <Check className="size-4 text-ok" aria-label="완료" />
          ) : s.status === "active" ? (
            <Loader2 className="size-4 animate-spin" aria-label="진행 중" />
          ) : s.status === "failed" ? (
            <X className="size-4" aria-label="실패" />
          ) : (
            <Circle className="size-4" aria-label="대기" />
          )}
          {s.label}
        </li>
      ))}
    </ol>
  );
}

function ViewSection({ view, photoUrl, analysis }: { view: CaptureView; photoUrl: string; analysis: PhotoAnalysis | undefined }) {
  return (
    <section aria-labelledby={`sec-${view}`} className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <AnalysisFigure photoUrl={photoUrl} analysis={analysis} alt={`${VIEW_LABEL[view]} 사진과 감지된 랜드마크`} />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`sec-${view}`} className="text-2xl font-bold tracking-tight">
            {VIEW_LABEL[view]} 분석
          </h2>
          {analysis?.quality && <QualityBadge level={analysis.quality.level} />}
          {analysis?.delegate && <span className="text-xs text-neutral-400">{analysis.modelVariant} 모델 · {analysis.delegate}</span>}
        </div>

        {!analysis && <p className="text-sm text-neutral-500">분석 중이에요…</p>}

        {analysis?.status === "error" && (
          <>
            <Notice tone="error" title="분석을 진행하지 못했어요">
              {analysis.error}
            </Notice>
            <Fallbacks view={view} />
          </>
        )}

        {analysis?.status === "rejected" && (
          <>
            <Notice tone="error" title="이 사진으로는 측정할 수 없어요">
              {analysis.quality?.primaryMessage} 가짜 값을 만들지 않기 위해 이 사진의 측정은 진행하지 않았어요.
            </Notice>
            <QualityList report={analysis.quality} />
            <Fallbacks view={view} />
          </>
        )}

        {analysis?.status === "ok" && analysis.features && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-neutral-500">측정된 비율</h3>
              {analysis.features.features.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-600">이 사진에서 계산할 수 있는 비율이 없었어요.</p>
              ) : (
                <dl className="mt-3 divide-y divide-black/5 rounded-2xl ring-1 ring-black/5">
                  {analysis.features.features.map((f) => (
                    <div key={f.id} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto] sm:gap-4">
                      <dt>
                        <span className="font-medium">{f.label}</span>
                        <span
                          className={cn(
                            "ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px]",
                            f.clothingSensitive ? "bg-amber-50 text-amber-800" : "bg-surface text-neutral-600",
                          )}
                        >
                          {f.source === "landmark" ? "관절 기반" : "윤곽 기반 · 옷 영향 큼"}
                        </span>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-600">{f.description}</p>
                      </dt>
                      <dd className="font-display text-2xl font-semibold tabular sm:text-right">{f.value.toFixed(2)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {analysis.features.notes.length > 0 && (
              <ul className="space-y-2">
                {analysis.features.notes.map((n) => (
                  <li key={n}>
                    <Notice tone="info">{n}</Notice>
                  </li>
                ))}
              </ul>
            )}
            <details className="group rounded-2xl p-4 ring-1 ring-black/5">
              <summary className="cursor-pointer text-sm font-medium">촬영 품질 세부 항목</summary>
              <div className="mt-3">
                <QualityList report={analysis.quality} />
              </div>
            </details>
          </>
        )}
      </div>
    </section>
  );
}

function Fallbacks({ view }: { view: CaptureView }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/capture?view=${view}`} className={cn(buttonVariants(), "rounded-full")}>
        다시 촬영
      </Link>
      <Link href={`/capture?view=${view}&mode=upload`} className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
        다른 사진 업로드
      </Link>
      <Link href="/check" className={cn(buttonVariants({ variant: "ghost" }), "rounded-full")}>
        사진 없이 자가 체크로 진행
      </Link>
    </div>
  );
}
