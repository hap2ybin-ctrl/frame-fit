"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { Camera, Link2, Loader2, RefreshCw, RotateCw, ScanLine, SkipForward, SwitchCamera, Timer, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/flow/Notice";
import { QualityList } from "./QualityPanel";
import { SEQUENCE_CUES, shutterSound, speak, stopSpeaking, voiceSupported } from "@/lib/camera/cues";
import { checkCameraEnvironment, mapCameraError, type CameraErrorInfo } from "@/lib/camera/errors";
import { captureVideoFrame, rgbaToCanvas, sampleLuminance, type CapturedPhoto } from "@/lib/image/image";
import { drawMeasurements, drawOutline, drawSkeleton, linesFromLandmarks } from "@/lib/pose/draw";
import type { PoseLandmark } from "@/lib/pose/landmarks";
import { getLandmarker, toPoseModelError, type LoadedLandmarker } from "@/lib/pose/landmarker";
import { maskLooksValid, maskToOutlineRGBA } from "@/lib/pose/mask";
import { allChecksPassed, assessQuality, checkProgress, type CaptureView, type LuminanceStats, type QualityReport } from "@/lib/pose/quality";
import { LandmarkSmoother, StabilityTracker } from "@/lib/pose/smoothing";
import { useHydrated } from "@/lib/store/session";
import { cn } from "@/lib/utils";

type Phase = "idle" | "starting" | "loading-model" | "running" | "error";
type Facing = "user" | "environment";

interface Props {
  view: CaptureView;
  onCapture: (photo: CapturedPhoto) => void;
  onUploadInstead: () => void;
  /** 정면·측면 연속 촬영 진행 정보 */
  sequence?: { index: number; total: number; prevThumb?: string };
  /** 연속 촬영에서 현재 단계(측면)를 건너뛰기 */
  onSkip?: () => void;
}

/** 모든 확인사항이 이 시간 동안 계속 통과해야 카운트다운 시작 */
const AUTO_READY_MS = 1000;
const COUNTDOWN_FROM = 3;
/** 정면 촬영 후 몸을 돌리는 동안 자동 촬영을 멈추는 시간 */
const TURN_CUE_MS = 3000;
/** 같은 품질 안내를 다시 읽기까지의 최소 간격 */
const VOICE_REPEAT_MS = 5000;

export function CameraStage({ view, onCapture, onUploadInstead, sequence, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<LoadedLandmarker | null>(null);
  const smootherRef = useRef(new LandmarkSmoother());
  const trackerRef = useRef(new StabilityTracker());
  const outlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const frameRef = useRef(0);
  const lumRef = useRef<LuminanceStats | null>(null);
  const lastUiRef = useRef(0);
  const readySinceRef = useRef<number | null>(null);
  const fpsRef = useRef({ last: 0, frames: 0, value: 0 });
  const optsRef = useRef({ outline: true, measure: true, auto: true, facing: "user" as Facing, view });
  const countdownRef = useRef<number | null>(null);
  const emptyMaskFramesRef = useRef(0);
  const turnCueRef = useRef(false);
  const voiceRef = useRef(false);
  const lastSpokenRef = useRef({ text: "", at: 0 });

  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [facing, setFacing] = useState<Facing>("user");
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [showOutline, setShowOutline] = useState(true);
  const [showMeasure, setShowMeasure] = useState(true);
  // 기본으로 켜짐: 모든 확인사항이 통과하면 3초 카운트다운 후 자동 촬영
  const [autoCapture, setAutoCapture] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [aspect, setAspect] = useState(3 / 4);
  const [info, setInfo] = useState<{ fps: number; delegate: string } | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [turnCue, setTurnCue] = useState(false);
  const [voice, setVoice] = useState(false);
  const [flash, setFlash] = useState(false);
  const hydrated = useHydrated();

  const say = useCallback((text: string) => {
    if (!voiceRef.current) return;
    lastSpokenRef.current = { text, at: performance.now() };
    speak(text);
  }, []);

  useEffect(() => {
    optsRef.current = { outline: showOutline, measure: showMeasure, auto: autoCapture, facing, view };
  }, [showOutline, showMeasure, autoCapture, facing, view]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopLoop]);

  const cancelCountdown = useCallback(() => {
    countdownRef.current = null;
    setCountdown(null);
  }, []);

  const doCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    cancelCountdown();
    const photo = captureVideoFrame(video, optsRef.current.facing);
    shutterSound();
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    onCapture(photo);
  }, [cancelCountdown, onCapture]);

  // ── 프레임 처리 ───────────────────────────────────────────────
  const processResult = useCallback(
    (result: PoseLandmarkerResult, ts: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const opts = optsRef.current;
      const poses: PoseLandmark[][] = result.landmarks.map((p) => p.map((l) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 })));

      // 밝기는 10프레임마다 측정
      frameRef.current++;
      if (frameRef.current % 10 === 1) lumRef.current = sampleLuminance(video, vw, vh);

      if (poses.length === 1) trackerRef.current.push(poses[0]);
      else {
        trackerRef.current.reset();
        smootherRef.current.reset();
      }
      const jitter = poses.length === 1 ? trackerRef.current.jitter(vw / vh) : null;
      const report = assessQuality({ poses, view: opts.view, imageWidth: vw, imageHeight: vh, luminance: lumRef.current, jitter });

      // 윤곽 마스크 → 오프스크린 캔버스
      const mask = result.segmentationMasks?.[0];
      let outlineReady = false;
      if (opts.outline && mask && poses.length === 1) {
        const data = mask.getAsFloat32Array();
        // GPU 마스크 읽기가 실패하는 환경(빈 마스크 반복)이면 CPU 추론으로 1회 전환
        if (!maskLooksValid(data)) {
          emptyMaskFramesRef.current++;
          if (emptyMaskFramesRef.current === 8 && landmarkerRef.current?.delegate === "GPU") {
            getLandmarker("VIDEO", "lite", true)
              .then((cpu) => {
                landmarkerRef.current = cpu;
              })
              .catch(() => {});
          }
        } else emptyMaskFramesRef.current = 0;
        const step = Math.max(2, Math.round(Math.max(mask.width, mask.height) / 320));
        const rgba = maskToOutlineRGBA({ data, width: mask.width, height: mask.height }, [255, 255, 255], { step, fillAlpha: 22, edgeAlpha: 210 });
        outlineCanvasRef.current = rgbaToCanvas(rgba, outlineCanvasRef.current ?? undefined);
        outlineReady = true;
      }

      // HUD 그리기
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, cw, ch);
        const drawOpts = { width: cw, height: ch, mirror: opts.facing === "user", scale: dpr };
        if (poses.length === 1) {
          const smoothed = smootherRef.current.smooth(poses[0], ts);
          const stable = report.canMeasure;
          if (outlineReady && outlineCanvasRef.current) drawOutline(ctx, outlineCanvasRef.current, { ...drawOpts, opacity: stable ? 1 : 0.5 });
          drawSkeleton(ctx, smoothed, { ...drawOpts, opacity: stable ? 1 : 0.6 });
          // 좌표가 불안정하면 측정선(비율)을 표시하지 않음
          if (opts.measure && stable) drawMeasurements(ctx, linesFromLandmarks(smoothed), drawOpts, opts.view === "front");
        } else if (poses.length > 1) {
          for (const p of poses) drawSkeleton(ctx, p, { ...drawOpts, opacity: 0.45 });
        }
      }

      // 자동 촬영: 모든 확인사항이 통과한 상태가 유지되면 카운트다운 시작.
      // 카운트다운 중에는 실패 항목이 생길 때만 취소(사소한 주의로 끊기지 않게). 몸을 돌리는 중(turnCue)에는 대기.
      const allPass = allChecksPassed(report);
      if (allPass && !turnCueRef.current) {
        readySinceRef.current ??= ts;
        if (opts.auto && countdownRef.current === null && ts - readySinceRef.current > AUTO_READY_MS) {
          countdownRef.current = COUNTDOWN_FROM;
          setCountdown(COUNTDOWN_FROM);
          say(SEQUENCE_CUES.countdown);
        }
      } else {
        readySinceRef.current = null;
      }
      if (countdownRef.current !== null && (!report.canMeasure || turnCueRef.current)) cancelCountdown();

      // FPS
      const f = fpsRef.current;
      f.frames++;
      if (ts - f.last > 1000) {
        f.value = Math.round((f.frames * 1000) / (ts - f.last));
        f.frames = 0;
        f.last = ts;
      }

      // UI 업데이트는 200ms 간격
      if (ts - lastUiRef.current > 200) {
        lastUiRef.current = ts;
        setQuality(report);
        setInfo({ fps: f.value, delegate: landmarkerRef.current?.delegate ?? "-" });
        // 음성 안내: 측정 불가 사유가 바뀌었거나 일정 시간 지속되면 읽어 줌
        const last = lastSpokenRef.current;
        const needsGuide = opts.auto ? !allPass : !report.canMeasure;
        if (voiceRef.current && needsGuide && !turnCueRef.current && countdownRef.current === null) {
          if (report.primaryMessage !== last.text ? ts - last.at > 1500 : ts - last.at > VOICE_REPEAT_MS) say(report.primaryMessage);
        }
      }
    },
    [cancelCountdown, say],
  );

  const loopRef = useRef<() => void>(() => {});
  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => loopRef.current());
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2 || video.paused) return;
    if (video.currentTime === lastVideoTimeRef.current) return;
    lastVideoTimeRef.current = video.currentTime;
    const ts = performance.now();
    try {
      lm.landmarker.detectForVideo(video, ts, (r) => processResult(r, ts));
    } catch (e) {
      console.error("[FRAME FIT] detectForVideo failed", e);
      stopLoop();
      setModelError("실시간 분석 중 오류가 발생했어요. 다시 시작하거나 사진 업로드를 이용해 주세요.");
      setPhase("error");
    }
  }, [processResult, stopLoop]);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  // ── 카메라 시작 ───────────────────────────────────────────────
  const start = useCallback(
    async (nextFacing: Facing) => {
      setCameraError(null);
      setModelError(null);
      const envErr = checkCameraEnvironment({
        isSecureContext: window.isSecureContext,
        hasMediaDevices: !!navigator.mediaDevices?.getUserMedia,
      });
      if (envErr) {
        setCameraError(envErr);
        setPhase("error");
        return;
      }
      stopStream();
      setPhase("starting");
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e) {
        const info = mapCameraError(e);
        if (info.code === "overconstrained") {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          } catch (e2) {
            setCameraError(mapCameraError(e2));
            setPhase("error");
            return;
          }
        } else {
          setCameraError(info);
          setPhase("error");
          return;
        }
      }
      streamRef.current = stream;
      const settings = stream.getVideoTracks()[0]?.getSettings();
      const actualFacing: Facing = settings?.facingMode === "environment" ? "environment" : settings?.facingMode === "user" ? "user" : nextFacing;
      setFacing(actualFacing);
      optsRef.current.facing = actualFacing;

      navigator.mediaDevices
        .enumerateDevices()
        .then((d) => setHasMultipleCameras(d.filter((x) => x.kind === "videoinput").length > 1))
        .catch(() => {});

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch (e) {
        setCameraError(mapCameraError(e));
        setPhase("error");
        return;
      }
      if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight);

      setPhase("loading-model");
      try {
        landmarkerRef.current = await getLandmarker("VIDEO", "lite");
      } catch (e) {
        setModelError(toPoseModelError(e).message);
        setPhase("error");
        return;
      }
      smootherRef.current.reset();
      trackerRef.current.reset();
      lastVideoTimeRef.current = -1;
      setPhase("running");
      say(optsRef.current.view === "front" ? SEQUENCE_CUES.startFront : SEQUENCE_CUES.turnToSide);
      stopLoop();
      rafRef.current = requestAnimationFrame(loop);
    },
    [loop, say, stopLoop, stopStream],
  );

  // 언마운트·화면 이동(Activity 숨김) 시 카메라 정지
  useEffect(() => {
    return () => {
      stopStream();
      setPhase("idle");
      setQuality(null);
      countdownRef.current = null;
      setCountdown(null);
    };
  }, [stopStream]);

  // 정면/측면 전환 시 추적 상태 초기화. 카메라가 켜진 채 측면으로 넘어오면 몸을 돌릴 시간을 줌
  useEffect(() => {
    trackerRef.current.reset();
    readySinceRef.current = null;
    countdownRef.current = null;
    if (!streamRef.current || view !== "side") return;
    turnCueRef.current = true;
    setTurnCue(true);
    setCountdown(null);
    say(SEQUENCE_CUES.turnToSide);
    const t = setTimeout(() => {
      turnCueRef.current = false;
      readySinceRef.current = null;
      setTurnCue(false);
    }, TURN_CUE_MS);
    return () => {
      clearTimeout(t);
      turnCueRef.current = false;
      setTurnCue(false);
    };
  }, [view, say]);

  // 언마운트 시 음성 중단
  useEffect(() => () => stopSpeaking(), []);

  // 카운트다운
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      doCapture();
      return;
    }
    const t = setTimeout(() => {
      if (countdownRef.current === null) return;
      countdownRef.current = countdown - 1;
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, doCapture]);

  const running = phase === "running";
  const canCapture = running && !!quality?.canMeasure;
  const statusText =
    phase === "starting"
      ? "카메라를 켜는 중…"
      : phase === "loading-model"
        ? "포즈 인식 모델을 불러오는 중… (처음 한 번은 몇 초 걸려요)"
        : quality?.primaryMessage ?? "사람을 찾는 중이에요";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div
          className="relative mx-auto overflow-hidden rounded-[1.75rem] bg-neutral-950 text-white shadow-xl"
          style={{ aspectRatio: String(aspect), width: `min(100%, calc(72svh * ${aspect}))` }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="카메라 미리보기"
            className={cn("absolute inset-0 h-full w-full object-cover", facing === "user" && "-scale-x-100", !running && phase !== "loading-model" && "opacity-0")}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
            }}
          />
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />

          {/* 프레이밍 가이드 */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <g stroke="white" strokeOpacity="0.55" strokeWidth="0.5" fill="none" vectorEffect="non-scaling-stroke">
              <path d="M4 12V4h8M88 4h8v8M96 88v8h-8M12 96H4v-8" vectorEffect="non-scaling-stroke" />
            </g>
            <g stroke="white" strokeOpacity="0.28" strokeDasharray="2 2" vectorEffect="non-scaling-stroke">
              <line x1="10" x2="90" y1="5" y2="5" vectorEffect="non-scaling-stroke" />
              <line x1="10" x2="90" y1="95" y2="95" vectorEffect="non-scaling-stroke" />
              <line x1="50" x2="50" y1="8" y2="92" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {running && (!quality || quality.checks[0]?.status === "fail") && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <svg viewBox="0 0 60 160" className="h-[82%] opacity-40">
                <path
                  d="M30 4c7 0 11 5 11 12s-4 11-8 12l16 6c5 2 7 6 8 10l4 28c1 6 1 17 0 21h-5l-4-26-2 22c3 4 3 8 3 11l-2 37 1 20H40l-2-34-4-26h-2l-4 26-2 34H14l1-20-2-37c0-3 0-7 3-11l-2-22-4 26H5c-1-4-1-15 0-21l4-28c1-4 3-8 8-10l16-6c-4-1-8-5-8-12s4-12 11-12z"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
              </svg>
            </div>
          )}

          {/* 상단 상태 */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  !running ? "bg-neutral-400" : quality?.canMeasure ? "bg-emerald-400" : quality?.level === "poor" ? "bg-red-400" : "bg-amber-300",
                )}
              />
              {sequence && `${sequence.index}/${sequence.total} · `}
              {view === "front" ? "정면" : "측면"} ·{" "}
              {running
                ? turnCue
                  ? "몸 돌리는 중"
                  : countdown !== null
                    ? "자동 촬영 중"
                    : quality
                      ? `확인 ${checkProgress(quality).passed}/${checkProgress(quality).total}${autoCapture ? " · 모두 통과 시 자동 촬영" : ""}`
                      : "확인 중"
                : "대기"}
            </span>
            {running && info && (
              <span className="rounded-full bg-black/55 px-2.5 py-1 font-display tabular backdrop-blur">
                {info.fps} FPS · {info.delegate}
              </span>
            )}
          </div>

          {/* 시작 전 / 로딩 / 오류 */}
          {phase !== "running" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              {phase === "idle" && (
                <>
                  <ScanLine className="size-8 opacity-80" aria-hidden />
                  <p className="max-w-xs text-sm text-white/75">
                    버튼을 누르면 카메라 권한을 요청해요. 영상은 이 기기 밖으로 전송되지 않아요.
                  </p>
                  <Button size="lg" className="h-11 rounded-full bg-white px-5 text-ink hover:bg-white/90" onClick={() => start(facing)}>
                    <Camera className="size-4" aria-hidden /> 카메라 켜기
                  </Button>
                </>
              )}
              {(phase === "starting" || phase === "loading-model") && (
                <>
                  <Loader2 className="size-7 animate-spin" aria-hidden />
                  <p className="text-sm text-white/80" role="status">
                    {statusText}
                  </p>
                </>
              )}
              {phase === "error" && (
                <div className="max-w-sm space-y-3" role="alert">
                  <p className="text-base font-semibold">{cameraError?.title ?? "분석 엔진을 시작하지 못했어요"}</p>
                  <p className="text-sm leading-relaxed text-white/75">{cameraError?.message ?? modelError}</p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {(cameraError?.retryable ?? true) && (
                      <Button variant="secondary" className="rounded-full" onClick={() => start(facing)}>
                        <RefreshCw className="size-4" aria-hidden /> 다시 시도
                      </Button>
                    )}
                    {(cameraError?.code === "denied" || cameraError?.code === "insecure") && (
                      <Button
                        variant="secondary"
                        className="rounded-full"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(window.location.href)
                            .then(() => setLinkCopied(true))
                            .catch(() => setLinkCopied(false));
                        }}
                      >
                        <Link2 className="size-4" aria-hidden /> {linkCopied ? "주소 복사됨" : "주소 복사"}
                      </Button>
                    )}
                    <Button variant="secondary" className="rounded-full" onClick={onUploadInstead}>
                      <Upload className="size-4" aria-hidden /> 사진 업로드로 진행
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 연속 촬영: 정면 썸네일 */}
          {sequence?.prevThumb && running && (
            // eslint-disable-next-line @next/next/no-img-element -- 로컬 dataURL 썸네일
            <img
              src={sequence.prevThumb}
              alt="촬영된 정면 사진"
              className="absolute right-3 top-12 h-24 w-auto rounded-xl object-cover ring-2 ring-white/80 shadow-lg"
            />
          )}

          {/* 연속 촬영: 몸 돌리기 안내 */}
          {turnCue && running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 p-6 text-center" role="status" aria-live="assertive">
              <RotateCw className="size-10 animate-spin [animation-duration:2.4s]" aria-hidden />
              <p className="text-xl font-semibold">정면 촬영 완료</p>
              <p className="max-w-xs text-sm leading-relaxed text-white/80">몸을 옆으로 90도 돌려 옆모습이 보이게 서 주세요. 팔은 자연스럽게 내려 주세요.</p>
            </div>
          )}

          {/* 셔터 플래시 */}
          {flash && <div className="pointer-events-none absolute inset-0 bg-white/70" aria-hidden />}

          {/* 카운트다운 */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20" aria-live="assertive">
              <span className="font-display text-8xl font-semibold tabular drop-shadow-lg">{countdown}</span>
            </div>
          )}

          {/* 하단 안내 */}
          {running && (
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="mx-auto w-fit max-w-full rounded-2xl bg-black/60 px-4 py-2 text-center text-sm leading-snug backdrop-blur" role="status" aria-live="polite">
                {statusText}
              </p>
            </div>
          )}
        </div>

        {/* 컨트롤 */}
        <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-full"
            disabled={!running && phase !== "error"}
            onClick={() => start(facing === "user" ? "environment" : "user")}
            aria-label="전면·후면 카메라 전환"
            title={hasMultipleCameras ? undefined : "카메라가 하나뿐이면 전환되지 않을 수 있어요"}
          >
            <SwitchCamera className="size-4" aria-hidden /> {facing === "user" ? "후면 카메라" : "전면 카메라"}
          </Button>
          <Button
            size="lg"
            className="h-14 rounded-full px-8 text-base"
            disabled={!canCapture}
            onClick={doCapture}
            aria-describedby="capture-hint"
          >
            <Camera className="size-5" aria-hidden /> {view === "front" ? "정면" : "측면"} 촬영
          </Button>
          {onSkip ? (
            <Button variant="ghost" className="h-10 rounded-full" onClick={onSkip}>
              <SkipForward className="size-4" aria-hidden /> 측면 건너뛰기
            </Button>
          ) : (
            <Button variant="ghost" className="h-10 rounded-full" onClick={onUploadInstead}>
              <Upload className="size-4" aria-hidden /> 업로드
            </Button>
          )}
        </div>
        <p id="capture-hint" className="mt-2 text-center text-xs text-neutral-500">
          {running && autoCapture
            ? "모든 확인사항이 통과하면 3초 카운트다운 후 자동으로 촬영해요. 직접 찍으려면 촬영 버튼을 누르세요."
            : running && !quality?.canMeasure
              ? "모든 필수 점검을 통과하면 촬영 버튼이 활성화돼요."
              : "저장되는 사진은 좌우 반전 없는 원본 방향으로 분석돼요."}
        </p>
      </div>

      <aside className="space-y-5 rounded-3xl p-5 ring-1 ring-black/5">
        <div>
          <h2 className="text-sm font-semibold">실시간 품질 점검</h2>
          <div className="mt-3">
            <QualityList report={running ? quality : null} compact />
          </div>
        </div>
        <div className="space-y-3 border-t border-black/5 pt-4">
          <Label className="justify-between gap-3 font-normal">
            인체 윤곽 표시
            <Switch checked={showOutline} onCheckedChange={(v) => setShowOutline(v)} />
          </Label>
          <Label className="justify-between gap-3 font-normal">
            측정선 표시
            <Switch checked={showMeasure} onCheckedChange={(v) => setShowMeasure(v)} />
          </Label>
          <Label className="justify-between gap-3 font-normal">
            <span className="flex items-center gap-1.5">
              <Timer className="size-3.5" aria-hidden /> 자동 촬영 (모두 통과 시 3초 후)
            </span>
            <Switch
              checked={autoCapture}
              onCheckedChange={(v) => {
                setAutoCapture(v);
                if (!v) cancelCountdown();
              }}
            />
          </Label>
          {hydrated && voiceSupported() && (
            <Label className="justify-between gap-3 font-normal">
              <span className="flex items-center gap-1.5">
                <Volume2 className="size-3.5" aria-hidden /> 음성 안내
              </span>
              <Switch
                checked={voice}
                onCheckedChange={(v) => {
                  setVoice(v);
                  voiceRef.current = v;
                  // iOS는 사용자 조작 안에서 한 번 말해야 이후 음성이 재생됨
                  if (v) speak("음성 안내를 켰어요.");
                  else stopSpeaking();
                }}
              />
            </Label>
          )}
        </div>
        {view === "side" && (
          <Notice tone="info">측면 윤곽은 옷을 포함한 외형이에요. 옷의 두께와 실제 신체 두께는 구분할 수 없어요.</Notice>
        )}
        <p className="text-xs leading-relaxed text-neutral-500">
          화면의 점과 선은 모델이 실제로 반환한 랜드마크만 표시해요. 흔들림이 크면 측정선을 숨기고 촬영을 막아요.
        </p>
      </aside>
    </div>
  );
}
