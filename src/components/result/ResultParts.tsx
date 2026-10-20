import { Camera, ClipboardCheck, GitCompareArrows } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CLASSIFICATION_LABEL, STRENGTH_LABEL, TYPE_META } from "@/lib/brand/typeMeta";
import { BODY_TYPES, type ClassificationResult, type Evidence, type TypeScores } from "@/lib/classifier/types";
import { cn } from "@/lib/utils";

export function TypeHero({ result }: { result: ClassificationResult }) {
  const { classification, primary, secondary } = result;
  const p = primary ? TYPE_META[primary] : null;
  const s = secondary ? TYPE_META[secondary] : null;
  const inconclusive = classification === "inconclusive";
  const mixed = classification === "mixed";

  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] p-7 sm:p-10", inconclusive || !p ? "bg-surface" : p.bgSoft)}>
      {mixed && s && (
        <div aria-hidden className={cn("absolute inset-y-0 right-0 w-1/2 opacity-70 [mask-image:linear-gradient(to_right,transparent,black)]", s.bgSoft)} />
      )}
      <div className="relative">
        <p className="font-display text-xs font-semibold tracking-[0.2em] text-neutral-500">
          골격 유형 경향 · 참고용
        </p>
        {inconclusive ? (
          <>
            <h2 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">판정 보류</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-neutral-700">{result.reasons[0]}</p>
            {p && result.scores[p.key] > 0 && (
              <p className="mt-2 text-sm text-neutral-500">참고로 현재까지 근거가 가장 많이 모인 쪽은 {p.label}이에요.</p>
            )}
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className={cn("size-4 rounded-full", p?.bg)} aria-hidden />
              <h2 className="text-5xl font-bold tracking-tight sm:text-7xl">
                {mixed && p && s ? (
                  <>
                    {p.label}
                    <span className="mx-2 font-light text-neutral-400">×</span>
                    {s.label}
                  </>
                ) : (
                  p?.label
                )}
              </h2>
            </div>
            <p className="mt-3 text-lg font-medium text-neutral-700">
              {CLASSIFICATION_LABEL[classification]}
              {!mixed && s && <span className="text-neutral-500"> · 두 번째로 가까운 경향 {s.label}</span>}
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-neutral-700">{mixed ? result.reasons[0] : p?.summary}</p>
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/80 px-3 py-1 font-medium ring-1 ring-black/5">{STRENGTH_LABEL[result.strength]}</span>
          <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-black/5">
            자가 체크 {result.answeredCount}/{result.totalQuestions}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-black/5">규칙 {result.rulesVersion}</span>
        </div>
      </div>
    </div>
  );
}

export function ScoreBars({ result }: { result: ClassificationResult }) {
  const max = Math.max(...BODY_TYPES.map((t) => result.scores[t]), 1);
  return (
    <div>
      <ul className="space-y-4">
        {BODY_TYPES.map((t) => {
          const m = TYPE_META[t];
          const v = result.visualScores[t];
          const sf = result.selfScores[t];
          return (
            <li key={t}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{m.label}</span>
                <span className="font-display tabular text-neutral-500">{result.scores[t].toFixed(1)}</span>
              </div>
              <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden>
                <div className={cn("h-full", m.bg)} style={{ width: `${(sf / max) * 100}%` }} />
                <div className={cn("h-full opacity-45", m.bg)} style={{ width: `${(v / max) * 100}%` }} />
              </div>
              <p className="sr-only">
                {m.label}: 자가 체크 {sf.toFixed(1)}, 사진 {v.toFixed(1)}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-neutral-700" /> 자가 체크 근거</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-neutral-700/45" /> 사진 근거</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        막대는 규칙이 일치한 정도를 더한 상대값이에요. 확률·정확도·신뢰도가 아니에요.
      </p>
    </div>
  );
}

function Contributions({ c }: { c: Partial<TypeScores> }) {
  const entries = BODY_TYPES.filter((t) => (c[t] ?? 0) > 0);
  if (!entries.length) return <span className="text-xs text-neutral-400">점수 반영 없음</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {entries.map((t) => (
        <span key={t} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", TYPE_META[t].bgSoft, TYPE_META[t].text)}>
          {TYPE_META[t].label} +{c[t]!.toFixed(1)}
        </span>
      ))}
    </span>
  );
}

function EvidenceRows({ items }: { items: Evidence[] }) {
  if (!items.length) return <p className="py-2 text-sm text-neutral-500">해당 근거가 없어요.</p>;
  return (
    <ul className="divide-y divide-black/5">
      {items.map((e, i) => (
        <li key={`${e.topic}-${i}`} className="grid gap-1.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{e.topic}</span>
            <Contributions c={e.contributions} />
          </div>
          <p className="text-neutral-600">{e.detail}</p>
          {e.caution && <p className="text-xs text-amber-800">{e.caution}</p>}
        </li>
      ))}
    </ul>
  );
}

export function EvidenceAccordion({ result }: { result: ClassificationResult }) {
  const visual = result.evidence.filter((e) => e.source === "visual");
  const self = result.evidence.filter((e) => e.source === "self");
  const system = result.evidence.filter((e) => e.source === "system");
  return (
    <Accordion multiple defaultValue={["visual"]} className="rounded-3xl px-5 ring-1 ring-black/5">
      <AccordionItem value="visual">
        <AccordionTrigger className="py-4 text-base">
          <span className="flex items-center gap-2">
            <Camera className="size-4" aria-hidden /> 사진에서 관찰된 근거 <span className="text-neutral-400">{visual.length}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <EvidenceRows items={visual} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="self">
        <AccordionTrigger className="py-4 text-base">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-4" aria-hidden /> 직접 체크한 근거 <span className="text-neutral-400">{self.length}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <EvidenceRows items={self} />
        </AccordionContent>
      </AccordionItem>
      {system.length > 0 && (
        <AccordionItem value="system">
          <AccordionTrigger className="py-4 text-base">
            <span className="flex items-center gap-2">
              <GitCompareArrows className="size-4" aria-hidden /> 근거 간 차이
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <EvidenceRows items={system} />
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
