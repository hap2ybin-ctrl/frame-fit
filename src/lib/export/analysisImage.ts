import type { PhotoAnalysis } from "../analysis/analyzePhoto";
import { dataUrlToImage } from "../image/image";
import { drawMeasurements, drawOutline, drawSkeleton } from "../pose/draw";

export interface AnalysisPhoto {
  label: string;
  canvas: HTMLCanvasElement;
}

/**
 * 분석 사진 위에 실제 감지된 랜드마크·측정선·윤곽을 합성 (기기 안에서만 처리).
 * 분석에 성공해 랜드마크가 있는 사진만 대상으로 합니다.
 */
export async function composeAnalysisPhoto(photoDataUrl: string, analysis: PhotoAnalysis, label: string): Promise<AnalysisPhoto | null> {
  if (analysis.status !== "ok" || !analysis.landmarks) return null;
  const img = await dataUrlToImage(photoDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  // 오버레이가 잘 보이도록 사진을 살짝 어둡게
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 결과 카드에서는 사진이 높이 약 620px로 축소되므로, 그 크기에서 읽히도록 높이 기준으로 선·글자를 키움
  const o = { width: canvas.width, height: canvas.height, scale: Math.max(1, canvas.height / 380) };
  if (analysis.outlineDataUrl) {
    const outline = await dataUrlToImage(analysis.outlineDataUrl);
    drawOutline(ctx, outline, o);
  }
  drawSkeleton(ctx, analysis.landmarks, o);
  if (analysis.features) drawMeasurements(ctx, analysis.features.lines, o, analysis.view === "front");
  return { label, canvas };
}
