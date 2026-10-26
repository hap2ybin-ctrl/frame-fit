"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import { Notice } from "@/components/flow/Notice";
import { Button } from "@/components/ui/button";
import { buildClassifierInput } from "@/lib/analysis/buildInput";
import { classify } from "@/lib/classifier/engine";
import { QUESTIONS, UNKNOWN_OPTION_ID } from "@/lib/classifier/questions.config";
import { DECISION } from "@/lib/classifier/rules.config";
import { usePreferences } from "@/lib/preferences/store";
import { autoRecordSession } from "@/lib/store/saved";
import { updateSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

export function CheckView() {
  const session = useSession();
  const hydrated = useHydrated();
  const router = useRouter();
  const pref = usePreferences();
  const [index, setIndex] = useState(0);

  const total = QUESTIONS.length;
  const q = QUESTIONS[Math.min(index, total - 1)];
  const answerOf = (id: string) => session.answers.find((a) => a.questionId === id)?.optionId;
  const selected = answerOf(q.id);
  const answered = session.answers.filter((a) => a.optionId !== UNKNOWN_OPTION_ID).length;
  const touched = session.answers.length;
  const atSummary = index >= total;

  function choose(optionId: string) {
    updateSession((s) => ({
      ...s,
      answers: [...s.answers.filter((a) => a.questionId !== q.id), { questionId: q.id, optionId }],
      result: null,
    }));
    // 선택 직후 다음 문항으로 (동작 줄이기 설정과 무관하게 즉시 이동)
    setTimeout(() => setIndex((i) => Math.min(i + 1, total)), 180);
  }

  function finish() {
    const input = buildClassifierInput({
      front: session.analyses.front,
      side: session.analyses.side,
      answers: session.answers,
      fittedClothing: session.fittedClothing,
    });
    const result = classify(input);
    const resultAt = new Date().toISOString();
    updateSession((s) => ({ ...s, result, resultAt }));
    // 검사 기록: 결과 요약 + 좌표·응답 (사진은 '사진도 함께 기록'을 켠 경우만). 자동 기록을 끈 경우 건너뜀
    autoRecordSession({ ...session, result, resultAt }, pref.style, pref.closet);
    router.push("/result");
  }

  if (!hydrated) return <div className="mx-auto h-96 w-full max-w-3xl animate-pulse rounded-3xl bg-surface" />;

  const photoOk = session.analyses.front?.status === "ok";

  return (
    <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
      {!photoOk && (
        <Notice tone="info" className="mb-6">
          정면 사진 분석 결과가 없어 이번 결과는 자가 체크만으로 정리돼요. 사진 분석을 추가하려면 촬영 단계로 돌아가세요.
        </Notice>
      )}

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span className="font-display tabular">
          {atSummary ? "완료" : `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
        </span>
        <span>응답 {answered}개 · 잘 모르겠어요 {touched - answered}개</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={touched} aria-label="체크 진행률">
        <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${(touched / total) * 100}%` }} />
      </div>

      {!atSummary ? (
        <fieldset key={q.id} className="ff-rise mt-8">
          <legend className="text-sm font-semibold text-neutral-500">{q.topic}</legend>
          <p className="mt-2 text-balance text-2xl font-bold leading-snug tracking-tight">{q.title}</p>
          <p className="mt-3 flex gap-2 text-sm leading-relaxed text-neutral-600">
            <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {q.howTo}
          </p>
          <div className="mt-6 grid gap-2.5" role="radiogroup" aria-label={q.topic}>
            {q.options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected === o.id}
                onClick={() => choose(o.id)}
                className={cn(
                  "rounded-2xl px-5 py-4 text-left ring-1 transition-all",
                  selected === o.id ? "bg-ink text-white ring-ink" : "bg-white ring-black/10 hover:ring-black/30",
                )}
              >
                <span className="block font-medium">{o.label}</span>
                {o.hint && <span className={cn("mt-0.5 block text-sm", selected === o.id ? "text-white/70" : "text-neutral-500")}>{o.hint}</span>}
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={selected === UNKNOWN_OPTION_ID}
              onClick={() => choose(UNKNOWN_OPTION_ID)}
              className={cn(
                "rounded-2xl px-5 py-3 text-left text-sm ring-1 transition-all",
                selected === UNKNOWN_OPTION_ID ? "bg-neutral-700 text-white ring-neutral-700" : "bg-surface text-neutral-600 ring-transparent hover:ring-black/10",
              )}
            >
              잘 모르겠어요 (점수에 반영하지 않음)
            </button>
          </div>
        </fieldset>
      ) : (
        <div className="ff-rise mt-8 space-y-5">
          <p className="text-2xl font-bold tracking-tight">체크를 마쳤어요</p>
          <ul className="divide-y divide-black/5 rounded-2xl ring-1 ring-black/5">
            {QUESTIONS.map((qq, i) => {
              const a = answerOf(qq.id);
              const opt = qq.options.find((o) => o.id === a);
              return (
                <li key={qq.id}>
                  <button type="button" onClick={() => setIndex(i)} className="flex w-full items-center justify-between gap-4 p-4 text-left text-sm hover:bg-surface">
                    <span className="text-neutral-500">{qq.topic}</span>
                    <span className="text-right font-medium">{opt ? opt.label : a === UNKNOWN_OPTION_ID ? "잘 모르겠어요" : "미응답"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {answered < DECISION.minSelfAnswers && (
            <Notice tone="warn" title="응답이 부족해요">
              잘 모르겠어요를 제외한 응답이 {DECISION.minSelfAnswers}개 이상이어야 유형 경향을 정리할 수 있어요. 지금 결과를 보면 &lsquo;판정 보류&rsquo;로 표시되고, 관찰된
              비율과 일반 스타일 가이드를 보여 드려요.
            </Notice>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" className="h-11 rounded-full" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft className="size-4" aria-hidden /> 이전
        </Button>
        {atSummary ? (
          <Button size="lg" className="h-12 rounded-full px-6 text-base" onClick={finish}>
            결과 보기 <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button variant="outline" className="h-11 rounded-full" onClick={() => setIndex((i) => Math.min(i + 1, total))}>
            {selected ? "다음" : "건너뛰기"} <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
