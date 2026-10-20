"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Camera, Check, ClipboardCheck, ImageOff, RotateCcw, SkipForward, Trash2, Upload } from "lucide-react";
import { CameraStage } from "@/components/camera/CameraStage";
import { UploadDrop } from "@/components/camera/UploadDrop";
import { Notice } from "@/components/flow/Notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CapturedPhoto } from "@/lib/image/image";
import type { CaptureView as View } from "@/lib/pose/quality";
import { getStorageWarning, updateSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

const VIEWS: Array<{ key: View; label: string; hint: string }> = [
  { key: "front", label: "정면", hint: "필수" },
  { key: "side", label: "측면", hint: "선택" },
];
const VIEW_LABEL: Record<View, string> = { front: "정면", side: "측면" };

type Target = View | "summary";

export function CaptureView() {
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();
  const paramView = params.get("view");
  // null이면 진행 상황에 따라 자동으로 다음 단계를 고름
  const [target, setTarget] = useState<Target | null>(paramView === "front" || paramView === "side" ? paramView : null);
  const [mode, setMode] = useState<"camera" | "upload">(params.get("mode") === "upload" ? "upload" : "camera");
  const [sequence, setSequence] = useState(true);
  const [sideSkipped, setSideSkipped] = useState(false);

  const { front, side } = session.captures;
  const autoTarget: Target = !front ? "front" : !side && sequence && !sideSkipped ? "side" : "summary";
  const current: Target = target ?? autoTarget;

  function save(v: View, p: CapturedPhoto) {
    updateSession((s) => {
      const analyses = { ...s.analyses };
      delete analyses[v];
      return { ...s, captures: { ...s.captures, [v]: p }, analyses, result: null, resultAt: null };
    });
    // 새로 찍었으면 자동 진행(연속 촬영이면 정면 → 측면), 다시 찍은 경우엔 요약으로
    setTarget(session.captures[v] ? "summary" : null);
  }

  function remove(v: View) {
    updateSession((s) => {
      const captures = { ...s.captures };
      const analyses = { ...s.analyses };
      delete captures[v];
      delete analyses[v];
      return { ...s, captures, analyses, result: null, resultAt: null };
    });
    if (v === "side") setSideSkipped(true);
    setTarget(v === "front" ? "front" : "summary");
  }

  function skipSide() {
    setSideSkipped(true);
    setTarget("summary");
  }

  const warning = hydrated ? getStorageWarning() : null;
  const capturingView = current === "summary" ? null : current;
  const inSequence = sequence && mode === "camera" && capturingView !== null;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      {/* 단계 표시 + 입력 방식 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ol className="flex items-center gap-2" aria-label="촬영 단계">
          {VIEWS.map((v, i) => {
            const done = hydrated && !!session.captures[v.key];
            const active = capturingView === v.key;
            return (
              <li key={v.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTarget(v.key)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors",
                    active ? "bg-ink text-white ring-ink" : done ? "bg-white text-ink ring-black/10" : "bg-surface text-neutral-500 ring-transparent hover:text-ink",
                  )}
                >
                  {done ? <Check className={cn("size-3.5", active ? "text-white" : "text-ok")} aria-label="완료" /> : <span className="font-display tabular text-xs">{i + 1}</span>}
                  {v.label}
                  <span className={cn("text-xs font-normal", active ? "text-white/60" : "text-neutral-400")}>{v.hint}</span>
                </button>
                {i === 0 && <span aria-hidden className="h-px w-4 bg-neutral-300" />}
              </li>
            );
          })}
        </ol>
        {capturingView && (
          <div className="flex flex-wrap items-center gap-3">
            <Label className="gap-2 font-normal text-neutral-600">
              <Switch checked={sequence} onCheckedChange={(v) => setSequence(v)} size="sm" />
              정면·측면 연속 촬영
            </Label>
            <div className="inline-flex w-fit rounded-full ring-1 ring-black/10" role="group" aria-label="입력 방식">
              <button
                onClick={() => setMode("camera")}
                aria-pressed={mode === "camera"}
                className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm", mode === "camera" ? "bg-ink text-white" : "text-neutral-600")}
              >
                <Camera className="size-4" aria-hidden /> 카메라
              </button>
              <button
                onClick={() => setMode("upload")}
                aria-pressed={mode === "upload"}
                className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm", mode === "upload" ? "bg-ink text-white" : "text-neutral-600")}
              >
                <Upload className="size-4" aria-hidden /> 사진 업로드
              </button>
            </div>
          </div>
        )}
      </div>

      {hydrated && capturingView && sequence && mode === "camera" && (
        <p className="mt-4 text-sm text-neutral-600">
          {capturingView === "front"
            ? "확인사항이 모두 통과하면 3초 후 자동으로 찍고, 카메라를 끄지 않고 바로 측면 촬영으로 이어져요. 음성 안내를 켜면 멀리 서서도 끝까지 진행할 수 있어요."
            : "몸을 옆으로 90도 돌려 주세요. 측면은 선택이라 건너뛸 수 있어요."}
        </p>
      )}

      <div className="mt-6">
        {!hydrated ? (
          <div className="h-96 animate-pulse rounded-3xl bg-surface" />
        ) : current === "summary" ? (
          <Summary
            front={front}
            side={side}
            onRetake={(v) => setTarget(v)}
            onRemove={remove}
            onAddSide={() => {
              setSideSkipped(false);
              setTarget("side");
            }}
          />
        ) : mode === "camera" ? (
          <CameraStage
            key="camera"
            view={current}
            onCapture={(p) => save(current, p)}
            onUploadInstead={() => setMode("upload")}
            sequence={inSequence ? { index: current === "front" ? 1 : 2, total: 2, prevThumb: current === "side" ? front?.dataUrl : undefined } : undefined}
            onSkip={current === "side" ? skipSide : undefined}
          />
        ) : (
          <div className="mx-auto max-w-xl space-y-3">
            <UploadDrop key={current} view={current} onLoaded={(p) => save(current, p)} />
            {current === "side" && (
              <Button variant="ghost" className="rounded-full" onClick={skipSide}>
                <SkipForward className="size-4" aria-hidden /> 측면 건너뛰기
              </Button>
            )}
          </div>
        )}
        {hydrated && capturingView && session.captures[capturingView] && (
          <div className="mt-3 text-center">
            <Button variant="ghost" className="rounded-full" onClick={() => setTarget("summary")}>
              기존 {VIEW_LABEL[capturingView]} 사진 유지
            </Button>
          </div>
        )}
      </div>

      {warning && <Notice tone="warn" className="mt-6">{warning}</Notice>}

      <div className="mt-10 rounded-3xl bg-surface p-5 sm:p-6">
        <Label className="items-start gap-3 font-normal leading-relaxed">
          <Checkbox
            checked={session.fittedClothing}
            onCheckedChange={(v) => updateSession((s) => ({ ...s, fittedClothing: !!v, result: null }))}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">몸에 붙는 얇은 옷을 입고 촬영했어요</span>
            <span className="mt-0.5 block text-sm text-neutral-600">
              체크하면 측면 윤곽 깊이를 낮은 비중으로 근거에 반영해요. 그래도 옷 두께와 신체 두께는 구분할 수 없어요.
            </span>
          </span>
        </Label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/check" className={cn(buttonVariants({ variant: "ghost" }), "h-11 rounded-full text-neutral-600")}>
          <ClipboardCheck className="size-4" aria-hidden /> 사진 없이 자가 체크만 하기
        </Link>
        <Button size="lg" className="h-12 rounded-full px-6 text-base" disabled={!hydrated || !front} onClick={() => router.push("/analyze")}>
          {side ? "정면·측면 분석하기" : "정면 사진으로 분석하기"} <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function Summary({
  front,
  side,
  onRetake,
  onRemove,
  onAddSide,
}: {
  front?: CapturedPhoto;
  side?: CapturedPhoto;
  onRetake: (v: View) => void;
  onRemove: (v: View) => void;
  onAddSide: () => void;
}) {
  const slots: Array<{ v: View; photo?: CapturedPhoto }> = [
    { v: "front", photo: front },
    { v: "side", photo: side },
  ];
  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold">{front && side ? "정면과 측면 사진이 준비되었어요" : "정면 사진이 준비되었어요"}</p>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:max-w-3xl">
        {slots.map(({ v, photo }) => (
          <figure key={v} className="space-y-3">
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-black/5">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- 로컬 dataURL 미리보기
                <img src={photo.dataUrl} alt={`${VIEW_LABEL[v]} 사진 미리보기`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-neutral-500">
                  <ImageOff className="size-6" aria-hidden />
                  측면 사진 없음
                  <span className="text-xs">상체 두께는 자가 체크로 보완해요</span>
                </div>
              )}
            </div>
            <figcaption className="space-y-2">
              <p className="text-sm font-medium">
                {VIEW_LABEL[v]}
                {photo && (
                  <span className="ml-1.5 font-normal text-neutral-500">
                    · {photo.source === "camera" ? "카메라" : "업로드"} {photo.width}×{photo.height}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {photo ? (
                  <>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => onRetake(v)}>
                      <RotateCcw className="size-3.5" aria-hidden /> 다시 촬영
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full text-neutral-600" onClick={() => onRemove(v)}>
                      <Trash2 className="size-3.5" aria-hidden /> 삭제
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="rounded-full" onClick={onAddSide}>
                    <Camera className="size-3.5" aria-hidden /> 측면 촬영하기
                  </Button>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="text-xs text-neutral-500">분석 단계에서 포즈를 다시 정밀하게 감지하고 품질을 점검해요.</p>
    </div>
  );
}
