import type { LuminanceStats } from "../pose/quality";
import { computeLuminance } from "../pose/quality";

/** 브라우저 전용 이미지 유틸. 모든 처리는 기기 안에서만 이루어집니다. */

export const MAX_PHOTO_EDGE = 1280;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MIN_PHOTO_EDGE = 320;

export interface CapturedPhoto {
  dataUrl: string;
  width: number;
  height: number;
  source: "camera" | "upload";
  /** 촬영 시 전면 카메라였는지 (저장된 이미지는 항상 좌우 반전 없는 원본 방향) */
  facing?: "user" | "environment";
  capturedAt: string;
}

export class ImageLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageLoadError";
  }
}

function scaledSize(w: number, h: number, maxEdge = MAX_PHOTO_EDGE) {
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export function drawToJpeg(source: CanvasImageSource, srcW: number, srcH: number, quality = 0.88): { dataUrl: string; width: number; height: number } {
  const { width, height } = scaledSize(srcW, srcH);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageLoadError("이미지를 처리할 수 없어요.");
  ctx.drawImage(source, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), width, height };
}

/** 업로드 파일 → 축소된 JPEG (EXIF 회전 반영) */
export async function loadImageFile(file: File): Promise<CapturedPhoto> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new ImageLoadError("이미지 파일만 올릴 수 있어요.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageLoadError("파일이 너무 커요. 25MB 이하의 사진을 사용해 주세요.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
    throw new ImageLoadError(
      heic
        ? "이 브라우저에서는 HEIC 사진을 열 수 없어요. 카메라 설정에서 '호환성 우선(JPG)'으로 찍거나 JPG로 변환해 올려 주세요."
        : "사진을 열 수 없어요. 손상되지 않은 JPG·PNG 파일인지 확인해 주세요.",
    );
  }
  try {
    if (Math.min(bitmap.width, bitmap.height) < MIN_PHOTO_EDGE) {
      throw new ImageLoadError(`사진 해상도가 너무 낮아요. 짧은 쪽이 ${MIN_PHOTO_EDGE}px 이상인 사진을 사용해 주세요.`);
    }
    const out = drawToJpeg(bitmap, bitmap.width, bitmap.height);
    return { ...out, source: "upload", capturedAt: new Date().toISOString() };
  } finally {
    bitmap.close();
  }
}

/** 영상 프레임 캡처 (좌우 반전하지 않은 원본 방향) */
export function captureVideoFrame(video: HTMLVideoElement, facing: "user" | "environment"): CapturedPhoto {
  const out = drawToJpeg(video, video.videoWidth, video.videoHeight, 0.9);
  return { ...out, source: "camera", facing, capturedAt: new Date().toISOString() };
}

export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageLoadError("저장된 사진을 불러오지 못했어요. 다시 촬영해 주세요."));
    img.src = dataUrl;
  });
}

let lumCanvas: HTMLCanvasElement | null = null;

/** 작은 캔버스로 축소해 평균 밝기와 대비 측정 */
export function sampleLuminance(source: CanvasImageSource, srcW: number, srcH: number): LuminanceStats | null {
  if (!srcW || !srcH) return null;
  lumCanvas ??= document.createElement("canvas");
  const w = 64;
  const h = Math.max(1, Math.round((64 * srcH) / srcW));
  lumCanvas.width = w;
  lumCanvas.height = h;
  const ctx = lumCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  return computeLuminance(ctx.getImageData(0, 0, w, h).data, 1);
}

/** RGBA 버퍼를 캔버스로 */
export function rgbaToCanvas(rgba: { data: Uint8ClampedArray; width: number; height: number }, target?: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = target ?? document.createElement("canvas");
  canvas.width = rgba.width;
  canvas.height = rgba.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.data), rgba.width, rgba.height), 0, 0);
  return canvas;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
