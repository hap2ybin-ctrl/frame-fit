"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoAnalysis } from "@/lib/analysis/analyzePhoto";
import { drawMeasurements, drawOutline, drawSkeleton } from "@/lib/pose/draw";

/** 사진 위에 실제 감지된 랜드마크·측정선·윤곽을 겹쳐 표시 */
export function AnalysisFigure({ photoUrl, analysis, alt }: { photoUrl: string; analysis: PhotoAnalysis | undefined; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [outlineImg, setOutlineImg] = useState<HTMLImageElement | null>(null);
  const [layers, setLayers] = useState({ skeleton: true, measure: true, outline: true });

  useEffect(() => {
    if (!analysis?.outlineDataUrl) return;
    const img = new Image();
    img.onload = () => setOutlineImg(img);
    img.src = analysis.outlineDataUrl;
    return () => {
      img.onload = null;
    };
  }, [analysis?.outlineDataUrl]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(wrap.clientWidth * dpr);
      const h = Math.round(wrap.clientHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      if (!analysis?.landmarks) return;
      const o = { width: w, height: h, scale: dpr };
      if (layers.outline && outlineImg) drawOutline(ctx, outlineImg, o);
      if (layers.skeleton) drawSkeleton(ctx, analysis.landmarks, o);
      if (layers.measure && analysis.features) drawMeasurements(ctx, analysis.features.lines, o, analysis.view === "front");
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [analysis, outlineImg, layers]);

  return (
    <figure className="space-y-3">
      <div
        ref={wrapRef}
        className="relative mx-auto overflow-hidden rounded-[1.5rem] bg-neutral-900 ring-1 ring-black/5"
        style={{ aspectRatio: analysis ? `${analysis.imageWidth} / ${analysis.imageHeight}` : undefined, maxHeight: "70svh" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 dataURL */}
        <img src={photoUrl} alt={alt} className="h-full w-full object-contain opacity-80" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
      </div>
      {analysis?.landmarks && (
        <figcaption className="flex flex-wrap justify-center gap-1.5 text-xs">
          {(
            [
              ["skeleton", "관절"],
              ["measure", "측정선"],
              ["outline", "윤곽"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={layers[k]}
              disabled={k === "outline" && !analysis.outlineDataUrl}
              onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
              className={
                "rounded-full px-3 py-1 ring-1 transition-colors disabled:opacity-40 " +
                (layers[k] ? "bg-ink text-white ring-ink" : "bg-white text-neutral-600 ring-black/10")
              }
            >
              {label}
            </button>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
