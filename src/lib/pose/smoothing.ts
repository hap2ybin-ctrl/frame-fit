import type { PoseLandmark } from "./landmarks";

/**
 * One Euro Filter — 저속 움직임에서는 떨림을 강하게 줄이고, 빠른 움직임에서는 지연을 줄이는 필터.
 * Casiez et al., "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems" (CHI 2012)
 *
 * 화면 표시용 랜드마크에만 적용합니다. 안정성 판정(측정 중단 여부)은 필터 전 원본 좌표로 계산합니다.
 */
class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number): number {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  last(): number | null {
    return this.y;
  }
  reset() {
    this.y = null;
  }
}

function smoothingAlpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private x = new LowPass();
  private dx = new LowPass();
  private lastT: number | null = null;

  constructor(
    private minCutoff = 1.2,
    private beta = 0.02,
    private dCutoff = 1.0,
  ) {}

  filter(value: number, tMs: number): number {
    if (this.lastT === null) {
      this.lastT = tMs;
      this.dx.filter(0, 1);
      return this.x.filter(value, 1);
    }
    const dt = Math.max((tMs - this.lastT) / 1000, 1e-3);
    this.lastT = tMs;
    const prev = this.x.last() ?? value;
    const dValue = (value - prev) / dt;
    const edx = this.dx.filter(dValue, smoothingAlpha(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, smoothingAlpha(cutoff, dt));
  }

  reset() {
    this.x.reset();
    this.dx.reset();
    this.lastT = null;
  }
}

/** 33개 랜드마크 x/y 각각에 One Euro Filter 적용 */
export class LandmarkSmoother {
  private filters: Array<{ x: OneEuroFilter; y: OneEuroFilter }> = [];

  smooth(landmarks: PoseLandmark[], tMs: number): PoseLandmark[] {
    if (this.filters.length !== landmarks.length) {
      this.filters = landmarks.map(() => ({ x: new OneEuroFilter(), y: new OneEuroFilter() }));
    }
    return landmarks.map((l, i) => ({
      ...l,
      x: this.filters[i].x.filter(l.x, tMs),
      y: this.filters[i].y.filter(l.y, tMs),
    }));
  }

  reset() {
    this.filters = [];
  }
}

/**
 * 최근 프레임들의 원본 좌표 흔들림을 측정합니다.
 * 반환값: 몸통 길이(어깨 중점~골반 중점) 대비 평균 이동량. 값이 크면 측정을 중단합니다.
 */
export class StabilityTracker {
  private history: PoseLandmark[][] = [];

  constructor(
    private windowSize = 8,
    private indices: ReadonlyArray<number> = [0, 11, 12, 23, 24, 25, 26, 27, 28],
  ) {}

  push(landmarks: PoseLandmark[]) {
    this.history.push(landmarks);
    if (this.history.length > this.windowSize) this.history.shift();
  }

  reset() {
    this.history = [];
  }

  get ready(): boolean {
    return this.history.length >= Math.min(4, this.windowSize);
  }

  /** 정규화 좌표 기준 이동량을 몸통 길이로 나눈 값. aspect = width/height */
  jitter(aspect: number): number | null {
    if (!this.ready) return null;
    const last = this.history[this.history.length - 1];
    const torso = torsoLength(last, aspect);
    if (!torso) return null;
    let total = 0;
    let count = 0;
    for (let f = 1; f < this.history.length; f++) {
      const a = this.history[f - 1];
      const b = this.history[f];
      for (const i of this.indices) {
        if (!a[i] || !b[i]) continue;
        total += Math.hypot((b[i].x - a[i].x) * aspect, b[i].y - a[i].y);
        count++;
      }
    }
    if (!count) return null;
    return total / count / torso;
  }
}

function torsoLength(l: PoseLandmark[], aspect: number): number | null {
  if (l.length < 25) return null;
  const sx = ((l[11].x + l[12].x) / 2) * aspect;
  const sy = (l[11].y + l[12].y) / 2;
  const hx = ((l[23].x + l[24].x) / 2) * aspect;
  const hy = (l[23].y + l[24].y) / 2;
  const d = Math.hypot(sx - hx, sy - hy);
  return d > 1e-4 ? d : null;
}
