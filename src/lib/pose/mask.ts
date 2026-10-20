/**
 * 인체 분할(segmentation) 마스크 처리 — 순수 함수.
 * mask: 길이 width*height, 값 0~1 (1에 가까울수록 사람 영역)
 *
 * 주의: 마스크는 "옷을 포함한 외형"입니다. 옷의 두께와 신체 두께를 구분할 수 없습니다.
 */

export interface MaskData {
  data: Float32Array | Uint8Array | number[];
  width: number;
  height: number;
  /** Uint8 마스크면 255, Float 마스크면 1 */
  scale?: number;
}

export interface RowRun {
  left: number;
  right: number;
  width: number;
}

function valueAt(m: MaskData, x: number, y: number): number {
  return m.data[y * m.width + x] / (m.scale ?? 1);
}

/**
 * 정규화된 y 위치의 행에서, 정규화된 기준 x를 포함하는(또는 가장 가까운) 연속 인체 구간을 찾습니다.
 * 팔이 몸통에서 떨어져 있으면 팔은 별도 구간이 되어 제외됩니다.
 * 반환 좌표는 정규화(0~1) 값입니다.
 */
export function rowRunAt(m: MaskData, yNorm: number, xNorm: number, threshold = 0.5): RowRun | null {
  const y = Math.min(m.height - 1, Math.max(0, Math.round(yNorm * (m.height - 1))));
  const cx = Math.min(m.width - 1, Math.max(0, Math.round(xNorm * (m.width - 1))));
  const runs: Array<[number, number]> = [];
  let start = -1;
  for (let x = 0; x < m.width; x++) {
    const inside = valueAt(m, x, y) >= threshold;
    if (inside && start < 0) start = x;
    if (!inside && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  if (start >= 0) runs.push([start, m.width - 1]);
  if (!runs.length) return null;
  let best = runs[0];
  let bestDist = Infinity;
  for (const r of runs) {
    const d = cx < r[0] ? r[0] - cx : cx > r[1] ? cx - r[1] : 0;
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  // 기준점에서 너무 멀리 떨어진 구간은 무시 (배경 노이즈)
  if (bestDist > m.width * 0.08) return null;
  const left = best[0] / m.width;
  const right = (best[1] + 1) / m.width;
  return { left, right, width: right - left };
}

/** yFrom~yTo 범위에서 폭이 가장 좁은/넓은 행 탐색 */
export function scanRuns(
  m: MaskData,
  yFrom: number,
  yTo: number,
  xCenter: (y: number) => number,
  steps = 12,
): Array<{ y: number; run: RowRun }> {
  const out: Array<{ y: number; run: RowRun }> = [];
  for (let s = 0; s <= steps; s++) {
    const y = yFrom + ((yTo - yFrom) * s) / steps;
    const run = rowRunAt(m, y, xCenter(y));
    if (run) out.push({ y, run });
  }
  return out;
}

/**
 * 마스크에 사람 영역(0.5 이상)이 조금이라도 있는지 표본 검사.
 * 일부 WebGL 환경에서는 GPU 마스크 읽기가 실패해 0으로만 채워지므로 이를 걸러냅니다.
 */
export function maskLooksValid(data: ArrayLike<number>, stride = 13): boolean {
  for (let i = 0; i < data.length; i += stride) if (data[i] >= 0.5) return true;
  return false;
}

/** 마스크 영역 비율 (사람이 차지하는 픽셀 비율) */
export function maskCoverage(m: MaskData, threshold = 0.5, step = 3): number {
  let inside = 0;
  let n = 0;
  for (let y = 0; y < m.height; y += step) {
    for (let x = 0; x < m.width; x += step) {
      if (valueAt(m, x, y) >= threshold) inside++;
      n++;
    }
  }
  return n ? inside / n : 0;
}

/**
 * 윤곽선 픽셀 계산 → RGBA 버퍼. 화면에 인체 외곽선을 표시할 때 사용.
 * step으로 해상도를 낮춰 실시간 처리 비용을 줄입니다.
 */
export function maskToOutlineRGBA(
  m: MaskData,
  color: [number, number, number],
  options: { fillAlpha?: number; edgeAlpha?: number; step?: number; threshold?: number } = {},
): { data: Uint8ClampedArray; width: number; height: number } {
  const step = Math.max(1, options.step ?? 1);
  const threshold = options.threshold ?? 0.5;
  const fillAlpha = options.fillAlpha ?? 28;
  const edgeAlpha = options.edgeAlpha ?? 235;
  const w = Math.floor(m.width / step);
  const h = Math.floor(m.height / step);
  const out = new Uint8ClampedArray(w * h * 4);
  const inside = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return valueAt(m, x * step, y * step) >= threshold;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const o = (y * w + x) * 4;
      out[o] = color[0];
      out[o + 1] = color[1];
      out[o + 2] = color[2];
      out[o + 3] = edge ? edgeAlpha : fillAlpha;
    }
  }
  return { data: out, width: w, height: h };
}
