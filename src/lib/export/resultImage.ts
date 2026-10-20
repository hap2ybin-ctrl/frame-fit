import { CLASSIFICATION_LABEL, STRENGTH_LABEL, TYPE_META } from "../brand/typeMeta";
import { describeMixed } from "../classifier/engine";
import type { ClassificationResult } from "../classifier/types";
import { BODY_TYPES } from "../classifier/types";
import { dataUrlToImage } from "../image/image";
import type { AnalysisPhoto } from "./analysisImage";

/** 분석 사진 섹션 높이 (사진을 포함할 때만 카드가 이만큼 길어짐) */
const PHOTO_SECTION_H = 820;

/**
 * 결과 요약 카드를 캔버스로 그려 PNG Blob 생성.
 * 기본은 사진·좌표 없이 만들고, 사용자가 선택한 경우에만 분석 사진(오버레이 합성본)을 넣습니다.
 */
export async function renderResultPng(
  result: ClassificationResult,
  dateText: string,
  options: { photos?: AnalysisPhoto[] } = {},
): Promise<Blob> {
  const photos = options.photos ?? [];
  const P = photos.length ? PHOTO_SECTION_H : 0;
  const W = 1080;
  const H = 1350 + P;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  const font = (weight: number, size: number) =>
    `${weight} ${size}px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`;
  if (document.fonts?.ready) await document.fonts.ready;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  const primary = result.primary && result.classification !== "inconclusive" ? TYPE_META[result.primary] : null;
  // 상단 컬러 블록
  ctx.fillStyle = primary ? primary.softHex : "#F6F6F4";
  ctx.fillRect(0, 0, W, 560);

  ctx.fillStyle = "#121316";
  ctx.font = font(700, 30);
  ctx.textBaseline = "top";
  ctx.fillText("FRAME FIT", 80, 80);
  ctx.font = font(400, 26);
  ctx.fillStyle = "#6B6F76";
  ctx.fillText(dateText, 80, 124);

  ctx.font = font(600, 30);
  ctx.fillStyle = primary ? primary.hex : "#6B6F76";
  ctx.fillText("골격 유형 경향 (참고용)", 80, 250);
  ctx.fillStyle = "#121316";
  ctx.font = font(800, 96);
  const title =
    result.classification === "mixed" && result.primary && result.secondary
      ? `${TYPE_META[result.primary].label} × ${TYPE_META[result.secondary].label}`
      : CLASSIFICATION_LABEL[result.classification];
  wrapText(ctx, title, 80, 300, W - 160, 110);

  ctx.font = font(500, 30);
  ctx.fillStyle = "#3A3D44";
  const leaning =
    result.classification === "mixed" && result.primary && result.secondary ? describeMixed(result.scores, result.primary, result.secondary) : null;
  const sub =
    result.classification === "inconclusive"
      ? "근거가 부족해 판정을 보류했어요"
      : leaning
        ? leaning.closer
          ? `${TYPE_META[leaning.closer].label} 쪽에 조금 더 가까워요`
          : "두 유형의 근거가 같아요"
        : result.secondary
          ? `두 번째로 가까운 경향 · ${TYPE_META[result.secondary].label}`
          : "";
  ctx.fillText(`${sub}${sub ? "  ·  " : ""}${STRENGTH_LABEL[result.strength]}`, 80, 470);

  // 분석 사진 (선택)
  if (photos.length) drawPhotoSection(ctx, photos, 600, W, font);

  // 점수 막대
  let y = 620 + P;
  ctx.font = font(700, 32);
  ctx.fillStyle = "#121316";
  ctx.fillText("누적 근거 점수", 80, y);
  ctx.font = font(400, 24);
  ctx.fillStyle = "#6B6F76";
  ctx.fillText("규칙 일치 정도의 상대값 · 확률이나 정확도가 아니에요", 80, y + 46);
  y += 110;
  const max = Math.max(...BODY_TYPES.map((t) => result.scores[t]), 1);
  for (const t of BODY_TYPES) {
    const m = TYPE_META[t];
    ctx.font = font(600, 28);
    ctx.fillStyle = "#121316";
    ctx.fillText(m.label, 80, y);
    ctx.fillStyle = "#F0F0EE";
    roundRect(ctx, 260, y + 4, 700, 26, 13);
    ctx.fill();
    ctx.fillStyle = m.hex;
    roundRect(ctx, 260, y + 4, Math.max(26, (700 * result.scores[t]) / max), 26, 13);
    ctx.fill();
    y += 64;
  }

  // 근거
  y += 30;
  ctx.font = font(700, 32);
  ctx.fillStyle = "#121316";
  ctx.fillText("주요 근거", 80, y);
  y += 56;
  ctx.font = font(400, 26);
  ctx.fillStyle = "#3A3D44";
  for (const e of result.evidence.filter((x) => x.source !== "system").slice(0, 4)) {
    // 하단 고지 문구 영역(아래 150px)을 침범하지 않도록 두 줄 여유가 없으면 중단
    if (y > H - 150 - 2 * 38) break;
    y = wrapText(ctx, `· ${e.topic}: ${e.detail}`, 80, y, W - 160, 38) + 10;
  }

  ctx.font = font(400, 22);
  ctx.fillStyle = "#8A8D93";
  wrapText(ctx, "포즈 랜드마크와 자가 체크 기반의 참고용 경향 분석이며, 골격 유형을 확정하거나 진단하지 않습니다.", 80, H - 120, W - 160, 32);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

function drawPhotoSection(
  ctx: CanvasRenderingContext2D,
  photos: AnalysisPhoto[],
  top: number,
  W: number,
  font: (weight: number, size: number) => string,
) {
  ctx.font = font(700, 32);
  ctx.fillStyle = "#121316";
  ctx.fillText("분석 사진", 80, top);
  ctx.font = font(400, 24);
  ctx.fillStyle = "#6B6F76";
  ctx.fillText("모델이 감지한 관절·측정선·윤곽 (옷 포함 외형)", 80, top + 46);

  const gap = 24;
  const boxTop = top + 100;
  const boxH = 620;
  const maxW = (W - 160 - gap * (photos.length - 1)) / photos.length;
  // 상자를 사진 비율에 맞춰 좌우 빈 여백을 없앰
  const widths = photos.map((ph) => Math.min(maxW, (boxH * ph.canvas.width) / ph.canvas.height));
  const rowW = widths.reduce((a, b) => a + b, 0) + gap * (photos.length - 1);
  let x = 80 + (W - 160 - rowW) / 2;
  photos.forEach((ph, i) => {
    const boxW = widths[i];
    ctx.save();
    roundRect(ctx, x, boxTop, boxW, boxH, 28);
    ctx.fillStyle = "#16171B";
    ctx.fill();
    ctx.clip();
    // 비율을 유지한 채 상자 안에 맞춤
    const k = Math.min(boxW / ph.canvas.width, boxH / ph.canvas.height);
    const w = ph.canvas.width * k;
    const h = ph.canvas.height * k;
    ctx.drawImage(ph.canvas, x + (boxW - w) / 2, boxTop + (boxH - h) / 2, w, h);
    ctx.restore();
    // 라벨
    ctx.font = font(600, 22);
    const tw = ctx.measureText(ph.label).width + 28;
    ctx.fillStyle = "rgba(17,18,20,0.75)";
    roundRect(ctx, x + 16, boxTop + 16, tw, 40, 20);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(ph.label, x + 30, boxTop + 37);
    ctx.textBaseline = "top";
    x += boxW + gap;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 한국어는 공백이 적어 글자 단위로 줄바꿈 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = ch;
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

/** PNG를 A4 PDF에 배치 (한글 폰트 임베드 없이 이미지로 넣어 깨짐 방지) */
export async function pngToPdf(png: Blob): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(png);
  });
  // PNG를 그대로 넣으면 용량이 커서 JPEG로 변환해 삽입
  // decode()는 숨겨진 탭에서 끝나지 않을 수 있어 onload 기반으로 로드
  const img = await dataUrlToImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const cctx = canvas.getContext("2d");
  if (!cctx) throw new Error("canvas unavailable");
  cctx.fillStyle = "#FFFFFF";
  cctx.fillRect(0, 0, canvas.width, canvas.height);
  cctx.drawImage(img, 0, 0);
  const jpeg = canvas.toDataURL("image/jpeg", 0.9);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  // 이미지 비율을 유지하며 여백 10mm 안에 맞춤 (사진 포함 시 세로가 더 김)
  const k = Math.min(170 / img.width, (pageH - 20) / img.height);
  const imgW = img.width * k;
  const imgH = img.height * k;
  pdf.addImage(jpeg, "JPEG", (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);
  return pdf.output("blob");
}
