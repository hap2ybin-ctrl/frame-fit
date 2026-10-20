import type { PoseLandmarker } from "@mediapipe/tasks-vision";

/**
 * MediaPipe Pose Landmarker 로더.
 * - WASM: /public/mediapipe/wasm (npm 패키지에서 복사, scripts/copy-mediapipe-wasm.mjs) → 실패 시 jsDelivr CDN
 * - 모델: Google 공식 모델 저장소에서 다운로드 (환경 변수로 자체 호스팅 경로 지정 가능)
 * 이미지·영상·좌표는 어디로도 전송하지 않습니다. 네트워크 요청은 WASM/모델 파일 다운로드뿐입니다.
 */

export const TASKS_VISION_VERSION = "1.1.1";
const WASM_LOCAL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/mediapipe/wasm`;
const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;

export type ModelVariant = "lite" | "full";
export type RunningMode = "IMAGE" | "VIDEO";

export const MODEL_URLS: Record<ModelVariant, string> = {
  lite:
    process.env.NEXT_PUBLIC_POSE_MODEL_LITE_URL ??
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  full:
    process.env.NEXT_PUBLIC_POSE_MODEL_FULL_URL ??
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
};

export type PoseModelErrorCode = "unsupported" | "wasm" | "model" | "init" | "unknown";

export class PoseModelError extends Error {
  constructor(
    public code: PoseModelErrorCode,
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "PoseModelError";
  }
}

export const POSE_MODEL_ERROR_TEXT: Record<PoseModelErrorCode, string> = {
  unsupported: "이 브라우저는 WebAssembly를 지원하지 않아 포즈 분석을 실행할 수 없어요. 최신 Chrome 또는 Safari를 사용해 주세요.",
  wasm: "분석 엔진 파일을 불러오지 못했어요. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
  model: "포즈 인식 모델을 내려받지 못했어요. 네트워크 연결이나 방화벽 설정을 확인해 주세요.",
  init: "분석 엔진을 시작하지 못했어요. 페이지를 새로고침하거나 다른 브라우저로 시도해 주세요.",
  unknown: "알 수 없는 오류로 포즈 분석을 시작하지 못했어요.",
};

export interface LoadedLandmarker {
  landmarker: PoseLandmarker;
  delegate: "GPU" | "CPU";
  variant: ModelVariant;
  mode: RunningMode;
}

const cache = new Map<string, Promise<LoadedLandmarker>>();
let wasmBasePromise: Promise<string> | null = null;

async function resolveWasmBase(): Promise<string> {
  if (!wasmBasePromise) {
    wasmBasePromise = fetch(`${WASM_LOCAL}/vision_wasm_internal.js`, { method: "HEAD" })
      .then((r) => (r.ok ? WASM_LOCAL : WASM_CDN))
      .catch(() => WASM_CDN);
  }
  return wasmBasePromise;
}

async function create(mode: RunningMode, variant: ModelVariant, forceCpu: boolean): Promise<LoadedLandmarker> {
  if (typeof WebAssembly === "undefined") {
    throw new PoseModelError("unsupported", POSE_MODEL_ERROR_TEXT.unsupported);
  }
  let vision: typeof import("@mediapipe/tasks-vision");
  try {
    vision = await import("@mediapipe/tasks-vision");
  } catch (e) {
    throw new PoseModelError("wasm", POSE_MODEL_ERROR_TEXT.wasm, e);
  }

  let fileset: Awaited<ReturnType<typeof vision.FilesetResolver.forVisionTasks>>;
  try {
    fileset = await vision.FilesetResolver.forVisionTasks(await resolveWasmBase());
  } catch (e) {
    throw new PoseModelError("wasm", POSE_MODEL_ERROR_TEXT.wasm, e);
  }

  // 모델 파일을 먼저 받아 네트워크 오류와 초기화 오류를 구분
  let modelBuffer: Uint8Array;
  try {
    const res = await fetch(MODEL_URLS[variant]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    modelBuffer = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    throw new PoseModelError("model", POSE_MODEL_ERROR_TEXT.model, e);
  }

  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetBuffer: modelBuffer, delegate },
    runningMode: mode,
    // 2명 이상 감지를 위해 2로 설정 → 2명이면 품질 점검에서 촬영 오류로 안내
    numPoses: 2,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: true,
  });

  if (!forceCpu) {
    try {
      const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options("GPU"));
      return { landmarker, delegate: "GPU", variant, mode };
    } catch {
      // GPU(WebGL) 초기화 실패 시 CPU로 재시도
    }
  }
  try {
    const landmarker = await vision.PoseLandmarker.createFromOptions(fileset, options("CPU"));
    return { landmarker, delegate: "CPU", variant, mode };
  } catch (e) {
    throw new PoseModelError("init", POSE_MODEL_ERROR_TEXT.init, e);
  }
}

/** 동일 설정의 랜드마커는 한 번만 생성 */
export function getLandmarker(mode: RunningMode, variant: ModelVariant, forceCpu = false): Promise<LoadedLandmarker> {
  const key = `${mode}:${variant}:${forceCpu ? "cpu" : "auto"}`;
  let p = cache.get(key);
  if (!p) {
    p = create(mode, variant, forceCpu);
    cache.set(key, p);
    // 실패한 로딩은 캐시에서 제거해 재시도 가능하게
    p.catch(() => cache.delete(key));
  }
  return p;
}

export function disposeLandmarker(mode: RunningMode, variant: ModelVariant, forceCpu = false) {
  const key = `${mode}:${variant}:${forceCpu ? "cpu" : "auto"}`;
  const p = cache.get(key);
  cache.delete(key);
  p?.then((l) => l.landmarker.close()).catch(() => {});
}

export function toPoseModelError(e: unknown): PoseModelError {
  return e instanceof PoseModelError ? e : new PoseModelError("unknown", POSE_MODEL_ERROR_TEXT.unknown, e);
}
