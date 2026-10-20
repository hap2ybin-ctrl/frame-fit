import type { MeasurementLines } from "../analysis/features";
import { KEY_JOINTS, LM, POSE_CONNECTIONS, type PoseLandmark } from "./landmarks";

/**
 * 캔버스 HUD 그리기. 좌표는 정규화(0~1) 랜드마크를 캔버스 크기에 매핑합니다.
 * mirror=true면 x를 1-x로 그려 좌우 반전된 비디오(셀피 미리보기)와 겹치게 합니다.
 * 텍스트는 반전하지 않으므로 항상 읽을 수 있습니다.
 */

export interface DrawOptions {
  width: number;
  height: number;
  mirror?: boolean;
  minVisibility?: number;
  /** 0~1, 측정 불가 상태일 때 흐리게 */
  opacity?: number;
  scale?: number; // devicePixelRatio 등
}

const HUD = {
  line: "rgba(255,255,255,0.82)",
  lineDim: "rgba(255,255,255,0.35)",
  joint: "#FFFFFF",
  jointRing: "rgba(255,255,255,0.35)",
  measure: "rgba(255,255,255,0.95)",
  labelBg: "rgba(17,18,20,0.72)",
  labelText: "#FFFFFF",
  shadow: "rgba(0,0,0,0.35)",
};

function mapX(x: number, o: DrawOptions) {
  return (o.mirror ? 1 - x : x) * o.width;
}
function mapY(y: number, o: DrawOptions) {
  return y * o.height;
}

export function drawSkeleton(ctx: CanvasRenderingContext2D, lms: PoseLandmark[], o: DrawOptions) {
  const s = o.scale ?? 1;
  const minVis = o.minVisibility ?? 0.5;
  ctx.save();
  ctx.globalAlpha = o.opacity ?? 1;
  ctx.lineCap = "round";
  ctx.shadowColor = HUD.shadow;
  ctx.shadowBlur = 4 * s;

  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = lms[a];
    const pb = lms[b];
    if (!pa || !pb) continue;
    const vis = Math.min(pa.visibility, pb.visibility);
    if (vis < minVis * 0.6) continue;
    // 얼굴 세부 연결은 얇게
    const face = a <= 10 && b <= 10;
    ctx.strokeStyle = vis >= minVis ? HUD.line : HUD.lineDim;
    ctx.lineWidth = (face ? 1 : 2) * s;
    ctx.beginPath();
    ctx.moveTo(mapX(pa.x, o), mapY(pa.y, o));
    ctx.lineTo(mapX(pb.x, o), mapY(pb.y, o));
    ctx.stroke();
  }

  // 33개 랜드마크 전부 표시 (작은 점), 주요 관절은 링 강조
  ctx.shadowBlur = 0;
  for (let i = 0; i < lms.length; i++) {
    const p = lms[i];
    if (p.visibility < minVis * 0.6) continue;
    ctx.fillStyle = p.visibility >= minVis ? HUD.joint : HUD.lineDim;
    ctx.beginPath();
    ctx.arc(mapX(p.x, o), mapY(p.y, o), (i <= 10 ? 1.6 : 2.4) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const { index } of KEY_JOINTS) {
    const p = lms[index];
    if (!p || p.visibility < minVis) continue;
    ctx.strokeStyle = HUD.jointRing;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(mapX(p.x, o), mapY(p.y, o), 7 * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number, align: CanvasTextAlign = "left") {
  ctx.save();
  ctx.font = `600 ${11 * s}px ui-sans-serif, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const w = ctx.measureText(text).width + 12 * s;
  const h = 20 * s;
  const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  ctx.fillStyle = HUD.labelBg;
  ctx.beginPath();
  ctx.roundRect(left, y - h / 2, w, h, 10 * s);
  ctx.fill();
  ctx.fillStyle = HUD.labelText;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, left + 6 * s, y + 0.5 * s);
  ctx.restore();
}

function dashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, s: number) {
  ctx.save();
  ctx.setLineDash([6 * s, 5 * s]);
  ctx.strokeStyle = HUD.measure;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** 어깨선, 골반선, 몸통/다리 길이 비율 오버레이 */
export function drawMeasurements(ctx: CanvasRenderingContext2D, lines: MeasurementLines, o: DrawOptions, showRatio = true) {
  const s = o.scale ?? 1;
  ctx.save();
  ctx.globalAlpha = o.opacity ?? 1;
  const ext = 0.04; // 선을 바깥으로 연장
  const hline = (pair: [{ x: number; y: number }, { x: number; y: number }], text: string) => {
    const [a, b] = pair[0].x < pair[1].x ? pair : [pair[1], pair[0]];
    const x1 = mapX(a.x - ext, o);
    const x2 = mapX(b.x + ext, o);
    dashedLine(ctx, x1, mapY(a.y, o), x2, mapY(b.y, o), s);
    const rightEdge = Math.max(x1, x2);
    label(ctx, text, rightEdge + 6 * s, mapY((a.y + b.y) / 2, o), s);
  };
  if (lines.shoulderLine) hline(lines.shoulderLine, "어깨선");
  if (lines.hipLine) hline(lines.hipLine, "골반선");

  if (lines.torso && lines.leg) {
    // 왼쪽에 세로 눈금자 형태로 몸통/다리 구간 표시
    const xs = [lines.torso[0].x, lines.torso[1].x, lines.leg[1].x];
    const minX = Math.min(...xs.map((x) => (o.mirror ? 1 - x : x)));
    const x = Math.max(0.03, minX - 0.16) * o.width;
    const y0 = mapY(lines.torso[0].y, o);
    const y1 = mapY(lines.torso[1].y, o);
    const y2 = mapY(lines.leg[1].y, o);
    ctx.strokeStyle = HUD.measure;
    ctx.lineWidth = 2 * s;
    for (const [ya, yb] of [
      [y0, y1],
      [y1, y2],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, ya + 3 * s);
      ctx.lineTo(x, yb - 3 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, ya + 3 * s);
      ctx.lineTo(x + 5 * s, ya + 3 * s);
      ctx.moveTo(x - 5 * s, yb - 3 * s);
      ctx.lineTo(x + 5 * s, yb - 3 * s);
      ctx.stroke();
    }
    label(ctx, "몸통", x + 8 * s, (y0 + y1) / 2, s);
    label(ctx, "다리", x + 8 * s, (y1 + y2) / 2, s);
    if (showRatio && y2 > y1) {
      const torsoLen = Math.hypot((lines.torso[1].x - lines.torso[0].x) * o.width, y1 - y0);
      const legLen = Math.hypot((lines.leg[1].x - lines.leg[0].x) * o.width, y2 - y1);
      if (legLen > 0) label(ctx, `몸통÷다리 ${(torsoLen / legLen).toFixed(2)}`, x - 6 * s, Math.max(12 * s, y0 - 18 * s), s);
    }
  }

  if (lines.silhouette) {
    const names: Record<string, string> = {
      shoulder: "윤곽 어깨",
      waist: "윤곽 허리",
      hip: "윤곽 엉덩이",
      upperDepth: "상체 앞뒤(옷 포함)",
      waistDepth: "허리 앞뒤(옷 포함)",
    };
    for (const [k, row] of Object.entries(lines.silhouette)) {
      if (!row) continue;
      const xa = mapX(row.left, o);
      const xb = mapX(row.right, o);
      const y = mapY(row.y, o);
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(Math.min(xa, xb), y);
      ctx.lineTo(Math.max(xa, xb), y);
      ctx.moveTo(xa, y - 5 * s);
      ctx.lineTo(xa, y + 5 * s);
      ctx.moveTo(xb, y - 5 * s);
      ctx.lineTo(xb, y + 5 * s);
      ctx.stroke();
      ctx.restore();
      label(ctx, names[k] ?? k, Math.min(xa, xb) - 6 * s, y, s, "right");
    }
  }
  ctx.restore();
}

/** 실시간 HUD용 측정선 — 랜드마크에서 바로 계산 */
export function linesFromLandmarks(l: PoseLandmark[]): MeasurementLines {
  const m = (a: PoseLandmark, b: PoseLandmark) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const sm = m(l[LM.LEFT_SHOULDER], l[LM.RIGHT_SHOULDER]);
  const hm = m(l[LM.LEFT_HIP], l[LM.RIGHT_HIP]);
  const am = m(l[LM.LEFT_ANKLE], l[LM.RIGHT_ANKLE]);
  return {
    shoulderLine: [l[LM.LEFT_SHOULDER], l[LM.RIGHT_SHOULDER]],
    hipLine: [l[LM.LEFT_HIP], l[LM.RIGHT_HIP]],
    torso: [sm, hm],
    leg: [hm, am],
  };
}

/** 분할 마스크 윤곽 캔버스를 오버레이 */
export function drawOutline(ctx: CanvasRenderingContext2D, outline: CanvasImageSource, o: DrawOptions) {
  ctx.save();
  ctx.globalAlpha = (o.opacity ?? 1) * 0.9;
  ctx.imageSmoothingEnabled = true;
  // 밝은 배경에서도 보이도록 어두운 후광
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 3 * (o.scale ?? 1);
  if (o.mirror) {
    ctx.translate(o.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(outline, 0, 0, o.width, o.height);
  ctx.restore();
}
