"use client";

import { useMemo, useState } from "react";
import { Camera, ClipboardCheck, Image as ImageIcon } from "lucide-react";
import type { PhotoAnalysis } from "@/lib/analysis/analyzePhoto";
import { buildInsights, type BodyInsight, type InsightPart } from "@/lib/analysis/insights";
import type { SelfAnswer } from "@/lib/classifier/types";
import { POSE_CONNECTIONS } from "@/lib/pose/landmarks";
import { cn } from "@/lib/utils";

/**
 * 체형 비율 맵: 실제 감지된 랜드마크로 그린 도식 위의 부위를 누르면 관찰 결과와 코디 팁을 보여 줌.
 * 기본은 사진 없이 도식만 표시하며, 사진 보기는 사용자가 켤 때만 (세션에 있는 사진 사용).
 */
export function BodyInsightMap({
  front,
  side,
  answers,
  photoUrl,
}: {
  front: PhotoAnalysis | undefined;
  side: PhotoAnalysis | undefined;
  answers: SelfAnswer[];
  photoUrl?: string;
}) {
  const frontOk = front?.status === "ok" && front.landmarks && front.features ? front : undefined;
  const insights = useMemo(
    () =>
      buildInsights({
        frontLandmarks: frontOk?.landmarks ?? null,
        front: frontOk?.features ?? null,
        side: side?.status === "ok" ? side.features : null,
        answers,
      }),
    [frontOk, side, answers],
  );
  const [selected, setSelected] = useState<InsightPart>(insights.find((i) => i.measured)?.part ?? insights[0]?.part ?? "collarbone");
  const [showPhoto, setShowPhoto] = useState(false);
  const current = insights.find((i) => i.part === selected) ?? insights[0];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
      <div className="mx-auto w-full max-w-[340px]">
        {frontOk ? (
          <Figure analysis={frontOk} insights={insights} selected={selected} onSelect={setSelected} photoUrl={showPhoto ? photoUrl : undefined} />
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-[1.5rem] bg-surface p-6 text-center text-sm text-neutral-500">
            <Camera className="size-6" aria-hidden />
            정면 사진 분석이 없어 도식을 그릴 수 없어요.
            <span className="text-xs">자가 체크로 답한 부위만 오른쪽에 정리했어요.</span>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-ink" aria-hidden /> 사진에서 측정
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full border-2 border-dashed border-neutral-400" aria-hidden /> 측정하지 않음
            </span>
          </span>
          {frontOk && photoUrl && (
            <button
              type="button"
              aria-pressed={showPhoto}
              onClick={() => setShowPhoto((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ring-black/10 hover:ring-black/30"
            >
              <ImageIcon className="size-3.5" aria-hidden /> {showPhoto ? "사진 숨기기" : "사진 위에 보기"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <ul className="flex flex-wrap gap-1.5" aria-label="부위 선택">
          {insights.map((i) => (
            <li key={i.part}>
              <button
                type="button"
                onClick={() => setSelected(i.part)}
                aria-pressed={selected === i.part}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition-colors",
                  selected === i.part ? "bg-ink text-white ring-ink" : "bg-white text-neutral-700 ring-black/10 hover:ring-black/30",
                  !i.measured && selected !== i.part && "border border-dashed border-neutral-300 ring-0",
                )}
              >
                {i.measured ? <Camera className="size-3.5" aria-hidden /> : <ClipboardCheck className="size-3.5" aria-hidden />}
                {i.title}
              </button>
            </li>
          ))}
        </ul>
        {current && <Detail insight={current} />}
        <p className="text-xs leading-relaxed text-neutral-500">
          참고 구간은 판정 규칙에 쓰는 검증되지 않은 기준이에요. 구간은 좋고 나쁨이 아니라, 코디 방향을 고르는 출발점이에요.
        </p>
      </div>
    </div>
  );
}

function Detail({ insight: i }: { insight: BodyInsight }) {
  return (
    <section aria-live="polite" className={cn("rounded-3xl p-5 sm:p-6", i.measured ? "bg-surface" : "border-2 border-dashed border-neutral-200")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold">{i.title}</h3>
        {i.measured ? (
          <span className="text-sm text-neutral-500">
            측정 비율 <span className="font-display text-xl font-semibold tabular text-ink">{i.value?.toFixed(2)}</span>
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs ring-1 ring-black/5">{i.bandLabel}</span>
          </span>
        ) : (
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-black/10">측정하지 않음</span>
        )}
      </div>
      <dl className="mt-4 space-y-3 text-sm leading-relaxed">
        <div>
          <dt className="font-semibold">관찰 결과</dt>
          <dd className="mt-0.5 text-neutral-700">{i.observation}</dd>
        </div>
        {!i.measured && (
          <div>
            <dt className="font-semibold">자가 체크 응답</dt>
            <dd className="mt-0.5 text-neutral-700">{i.selfAnswer}</dd>
          </div>
        )}
        <div>
          <dt className="font-semibold">코디 관련 팁</dt>
          <dd className="mt-0.5 text-neutral-700">{i.styling}</dd>
        </div>
        {i.caution && <p className="text-xs text-amber-800">{i.caution}</p>}
      </dl>
    </section>
  );
}

function Figure({
  analysis,
  insights,
  selected,
  onSelect,
  photoUrl,
}: {
  analysis: PhotoAnalysis;
  insights: BodyInsight[];
  selected: InsightPart;
  onSelect: (p: InsightPart) => void;
  photoUrl?: string;
}) {
  const W = analysis.imageWidth;
  const H = analysis.imageHeight;
  const l = analysis.landmarks!;
  // 신체가 있는 영역만 잘라서 보여 줌 (픽셀 좌표 기준)
  const xs = l.map((p) => p.x * W);
  const ys = l.map((p) => p.y * H);
  const pad = 0.08 * H;
  const vx = Math.max(0, Math.min(...xs) - pad);
  const vy = Math.max(0, Math.min(...ys) - pad);
  const vw = Math.min(W, Math.max(...xs) + pad) - vx;
  const vh = Math.min(H, Math.max(...ys) + pad) - vy;
  const pct = (x: number, y: number) => ({ left: `${((x * W - vx) / vw) * 100}%`, top: `${((y * H - vy) / vh) * 100}%` });
  const lines = analysis.features?.lines;
  const sw = vh / 220;

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] bg-neutral-900" style={{ aspectRatio: `${vw} / ${vh}` }}>
      <svg viewBox={`${vx} ${vy} ${vw} ${vh}`} className="absolute inset-0 h-full w-full" aria-hidden>
        {photoUrl && <image href={photoUrl} x={0} y={0} width={W} height={H} opacity={0.55} />}
        <g stroke="white" strokeOpacity={0.75} strokeWidth={sw * 1.6} strokeLinecap="round">
          {POSE_CONNECTIONS.filter(([a, b]) => a > 10 && b > 10).map(([a, b]) => (
            <line key={`${a}-${b}`} x1={l[a].x * W} y1={l[a].y * H} x2={l[b].x * W} y2={l[b].y * H} />
          ))}
        </g>
        <circle cx={l[0].x * W} cy={l[0].y * H} r={sw * 14} fill="none" stroke="white" strokeOpacity={0.5} strokeWidth={sw * 1.2} />
        {lines?.shoulderLine && (
          <line
            x1={lines.shoulderLine[0].x * W}
            y1={lines.shoulderLine[0].y * H}
            x2={lines.shoulderLine[1].x * W}
            y2={lines.shoulderLine[1].y * H}
            stroke="white"
            strokeWidth={sw}
            strokeDasharray={`${sw * 4} ${sw * 3}`}
          />
        )}
        {lines?.hipLine && (
          <line x1={lines.hipLine[0].x * W} y1={lines.hipLine[0].y * H} x2={lines.hipLine[1].x * W} y2={lines.hipLine[1].y * H} stroke="white" strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`} />
        )}
        {lines?.silhouette &&
          Object.values(lines.silhouette).map(
            (row, i) =>
              row && <line key={i} x1={row.left * W} x2={row.right * W} y1={row.y * H} y2={row.y * H} stroke="white" strokeOpacity={0.6} strokeWidth={sw} />,
          )}
      </svg>
      {insights
        .filter((i) => i.anchor)
        .map((i) => {
          const on = i.part === selected;
          return (
            <button
              key={i.part}
              type="button"
              onClick={() => onSelect(i.part)}
              aria-label={`${i.title}${i.measured ? "" : " (측정하지 않음)"} 보기`}
              aria-pressed={on}
              style={pct(i.anchor!.x, i.anchor!.y)}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform focus-visible:outline-white",
                on ? "z-10 scale-110" : "hover:scale-110",
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold shadow-md",
                  i.measured ? "bg-white text-ink" : "border-2 border-dashed border-white/80 bg-black/50 text-white",
                  on && (i.measured ? "ring-4 ring-white/40" : "bg-white text-ink"),
                )}
              >
                {i.title}
              </span>
            </button>
          );
        })}
    </div>
  );
}
