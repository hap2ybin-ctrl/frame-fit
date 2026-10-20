import type { MPMask, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { dataUrlToImage, rgbaToCanvas, sampleLuminance, type CapturedPhoto } from "../image/image";
import type { PoseLandmark } from "../pose/landmarks";
import { getLandmarker, toPoseModelError, type ModelVariant } from "../pose/landmarker";
import { maskLooksValid, maskToOutlineRGBA, type MaskData } from "../pose/mask";
import { assessQuality, type CaptureView, type QualityReport } from "../pose/quality";
import { computeFrontFeatures, computeSideFeatures, type ViewFeatures } from "./features";

export type AnalysisStep = "model" | "detect" | "quality" | "features" | "done";

export interface PhotoAnalysis {
  view: CaptureView;
  status: "ok" | "rejected" | "error";
  /** status=error일 때 사용자 안내 */
  error?: string;
  quality: QualityReport | null;
  /** 실제 모델이 반환한 랜드마크 (1명일 때만 저장) */
  landmarks: PoseLandmark[] | null;
  features: ViewFeatures | null;
  imageWidth: number;
  imageHeight: number;
  /** 인체 분할 윤곽 (작은 PNG) */
  outlineDataUrl: string | null;
  delegate: "GPU" | "CPU" | null;
  modelVariant: ModelVariant;
  analyzedAt: string;
}

function copyMask(m: MPMask): MaskData {
  // 마스크 수명은 콜백 안으로 한정되므로 즉시 복사
  return { data: new Float32Array(m.getAsFloat32Array()), width: m.width, height: m.height };
}

function copyPoses(r: PoseLandmarkerResult): PoseLandmark[][] {
  return r.landmarks.map((pose) => pose.map((l) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 })));
}

const OUTLINE_COLOR: [number, number, number] = [255, 255, 255];

export async function analyzePhoto(
  photo: CapturedPhoto,
  view: CaptureView,
  onStep?: (step: AnalysisStep) => void,
  variant: ModelVariant = "full",
): Promise<PhotoAnalysis> {
  const base = {
    view,
    imageWidth: photo.width,
    imageHeight: photo.height,
    modelVariant: variant,
    analyzedAt: new Date().toISOString(),
  };
  onStep?.("model");
  let loaded;
  try {
    // 사진 분석은 CPU로 실행: 단일 이미지라 속도 부담이 적고, 분할 마스크 읽기가 모든 환경에서 안정적
    loaded = await getLandmarker("IMAGE", variant, true);
  } catch (e) {
    const err = toPoseModelError(e);
    return { ...base, status: "error", error: err.message, quality: null, landmarks: null, features: null, outlineDataUrl: null, delegate: null };
  }

  onStep?.("detect");
  const img = await dataUrlToImage(photo.dataUrl);
  let poses: PoseLandmark[][] = [];
  let mask: MaskData | null = null;
  try {
    loaded.landmarker.detect(img, (result) => {
      poses = copyPoses(result);
      const m = result.segmentationMasks?.[0];
      if (m && poses.length === 1) {
        const copied = copyMask(m);
        // 일부 WebGL 환경에서는 마스크 읽기가 실패해 0으로만 채워짐 → 사용하지 않음
        if (maskLooksValid(copied.data)) mask = copied;
      }
    });
  } catch (e) {
    console.error("[FRAME FIT] pose detect failed", e);
    return {
      ...base,
      status: "error",
      error: "포즈 분석 중 오류가 발생했어요. 다른 사진으로 다시 시도해 주세요.",
      quality: null,
      landmarks: null,
      features: null,
      outlineDataUrl: null,
      delegate: loaded.delegate,
    };
  }

  onStep?.("quality");
  const luminance = sampleLuminance(img, img.naturalWidth, img.naturalHeight);
  const quality = assessQuality({ poses, view, imageWidth: img.naturalWidth, imageHeight: img.naturalHeight, luminance });

  if (!quality.canMeasure || poses.length !== 1) {
    return { ...base, status: "rejected", quality, landmarks: poses.length === 1 ? poses[0] : null, features: null, outlineDataUrl: null, delegate: loaded.delegate };
  }

  onStep?.("features");
  const landmarks = poses[0];
  const m = mask as MaskData | null;
  const features =
    view === "front"
      ? computeFrontFeatures(landmarks, img.naturalWidth, img.naturalHeight, m)
      : computeSideFeatures(landmarks, img.naturalWidth, img.naturalHeight, m);

  let outlineDataUrl: string | null = null;
  if (m) {
    const step = Math.max(1, Math.round(Math.max(m.width, m.height) / 480));
    outlineDataUrl = rgbaToCanvas(maskToOutlineRGBA(m, OUTLINE_COLOR, { step, fillAlpha: 0, edgeAlpha: 255 })).toDataURL("image/png");
  }

  onStep?.("done");
  return { ...base, status: "ok", quality, landmarks, features, outlineDataUrl, delegate: loaded.delegate };
}
