import type { FitClass, Garment, Outfit } from "../styling/types";

/**
 * 실루엣 비교용 의복 도해 계산 (순수 함수).
 * 사용자의 실제 신체가 아니라 고정된 표준 도식(마네킹) 위에 그리는 시뮬레이션입니다.
 * 좌표계: viewBox 0 0 200 440, 가운데 x = 100.
 */

export type TopLength = "crop" | "waist" | "hip" | "long";
export type WaistLine = "high" | "natural" | "low" | "untucked";
export type BottomShape = "skinny" | "straight" | "wide" | "tapered" | "skirt";
export type OuterKind = "none" | "short" | "long";

export interface FitLabParams {
  topLength: TopLength;
  waistLine: WaistLine;
  bottom: BottomShape;
  outer: OuterKind;
}

export const DEFAULT_FITLAB: FitLabParams = { topLength: "hip", waistLine: "untucked", bottom: "straight", outer: "none" };

export const TOP_LENGTH_LABEL: Record<TopLength, string> = { crop: "크롭", waist: "허리선", hip: "골반", long: "롱" };
export const WAIST_LABEL: Record<WaistLine, string> = { high: "하이웨이스트(넣어 입기)", natural: "제 허리(넣어 입기)", low: "로우(넣어 입기)", untucked: "빼 입기" };
export const BOTTOM_LABEL: Record<BottomShape, string> = { skinny: "스키니", straight: "스트레이트", wide: "와이드", tapered: "테이퍼드", skirt: "A라인 스커트" };
export const OUTER_LABEL: Record<OuterKind, string> = { none: "없음", short: "짧은 아우터", long: "롱 아우터" };

/** 표준 도식 치수 */
export const MANNEQUIN = {
  cx: 100,
  headTop: 20,
  headCy: 38,
  headR: 18,
  shoulderY: 72,
  shoulderHalf: 34,
  waistY: 152,
  waistHalf: 22,
  hipY: 190,
  hipHalf: 30,
  crotchY: 214,
  kneeY: 310,
  ankleY: 404,
  floorY: 420,
  legOffset: 15,
} as const;

const M = MANNEQUIN;

/** 핏별 여유분 */
export const FIT_EASE: Record<FitClass, { body: number; shoulderDrop: number; sleeve: number; leg: number; hem: number }> = {
  // hem: 빼 입을 때 기장 차이 (오버핏 상의는 같은 표기 기장이라도 더 길게 떨어짐)
  slim: { body: 2, shoulderDrop: 0, sleeve: 0, leg: -2, hem: -4 },
  regular: { body: 8, shoulderDrop: 3, sleeve: 3, leg: 0, hem: 0 },
  over: { body: 20, shoulderDrop: 12, sleeve: 8, leg: 6, hem: 12 },
};

const HEM_Y: Record<TopLength, number> = { crop: 138, waist: 160, hip: 206, long: 252 };
const WAIST_Y: Record<Exclude<WaistLine, "untucked">, number> = { high: 138, natural: M.waistY, low: 176 };

/** 몸 실루엣의 반폭 (y 위치에 따라 선형 보간) */
export function bodyHalfAt(y: number): number {
  const pts: Array<[number, number]> = [
    [M.shoulderY, M.shoulderHalf],
    [110, 28],
    [M.waistY, M.waistHalf],
    [M.hipY, M.hipHalf],
    [M.crotchY, 31],
  ];
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, h0] = pts[i - 1];
      const [y1, h1] = pts[i];
      return h0 + ((h1 - h0) * (y - y0)) / (y1 - y0);
    }
  }
  return 31;
}

const r = (n: number) => Math.round(n * 10) / 10;
const pts = (list: Array<[number, number]>) => "M" + list.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L") + " Z";

export interface Silhouette {
  top: string;
  sleeves: [string, string];
  bottom: string;
  outer: [string, string] | null;
  /** 아우터 소매 (상의 소매 위에 덮임) */
  outerSleeves: [string, string] | null;
  /** 상의(또는 넣어 입은 허리선)가 끝나 하의가 시작되는 시각적 경계 */
  breakY: number;
  /** 도해 기준 상:하 시각 분할 (머리 끝~경계 : 경계~바닥), 합 100 */
  split: { upper: number; lower: number };
  /** 가장 넓은 가로 폭 (도해 단위) */
  maxWidth: number;
  tucked: boolean;
}

export function computeSilhouette(fit: FitClass, p: FitLabParams): Silhouette {
  const ease = FIT_EASE[fit];
  const cx = M.cx;
  const tucked = p.waistLine !== "untucked";
  const riseY = tucked ? WAIST_Y[p.waistLine as Exclude<WaistLine, "untucked">] : M.waistY;

  // ── 상의 ─────────────────────────────────────
  const hemY = tucked ? riseY + 4 : HEM_Y[p.topLength] + ease.hem;
  const shoulderX = M.shoulderHalf + ease.shoulderDrop;
  const hemHalf = Math.max(bodyHalfAt(hemY), bodyHalfAt(Math.min(hemY, M.hipY))) + ease.body;
  const chestHalf = bodyHalfAt(110) + ease.body;
  const top = pts([
    [cx - 8, M.shoulderY - 6],
    [cx - shoulderX, M.shoulderY + (ease.shoulderDrop > 6 ? 6 : 0)],
    [cx - chestHalf, 112],
    [cx - hemHalf, hemY],
    [cx + hemHalf, hemY],
    [cx + chestHalf, 112],
    [cx + shoulderX, M.shoulderY + (ease.shoulderDrop > 6 ? 6 : 0)],
    [cx + 8, M.shoulderY - 6],
  ]);
  const sleeveEnd = 214;
  const sw = 9 + ease.sleeve;
  const sleeve = (dir: -1 | 1, extra = 0): string => {
    const sx = cx + dir * (shoulderX + extra);
    const sy = M.shoulderY + (ease.shoulderDrop > 6 ? 6 : 0);
    const ex = cx + dir * (M.shoulderHalf + 10 + ease.sleeve * 0.6 + extra);
    const w = sw + extra;
    return pts([
      [sx, sy],
      [sx + dir * w, sy + 8],
      [ex + dir * (w * 0.7), sleeveEnd - extra * 2],
      [ex - dir * (w * 0.5), sleeveEnd - extra * 2],
      [sx - dir * 4, sy + 30],
    ]);
  };

  // ── 하의 ─────────────────────────────────────
  let bottom: string;
  let maxWidth = Math.max(hemHalf, chestHalf, shoulderX + sw) * 2;
  if (p.bottom === "skirt") {
    const hem = 330;
    const half = 44 + ease.body * 0.8;
    bottom = pts([
      [cx - bodyHalfAt(riseY) - 2, riseY],
      [cx + bodyHalfAt(riseY) + 2, riseY],
      [cx + half, hem],
      [cx - half, hem],
    ]);
    maxWidth = Math.max(maxWidth, half * 2);
  } else {
    const legShape: Record<Exclude<BottomShape, "skirt">, { thigh: number; knee: number; hem: number; hemY: number }> = {
      skinny: { thigh: 14, knee: 9, hem: 7, hemY: M.ankleY },
      straight: { thigh: 17, knee: 14, hem: 13, hemY: M.ankleY },
      wide: { thigh: 21, knee: 22, hem: 24, hemY: M.floorY - 4 },
      tapered: { thigh: 19, knee: 13, hem: 8, hemY: M.ankleY - 10 },
    };
    const L = legShape[p.bottom];
    const k = ease.leg;
    const waistHalf = bodyHalfAt(riseY) + 1;
    const hipHalf = M.hipHalf + Math.max(0, k);
    const lo = M.legOffset;
    bottom = pts([
      [cx - waistHalf, riseY],
      [cx + waistHalf, riseY],
      [cx + hipHalf, M.hipY],
      [cx + lo + L.thigh + k, 236],
      [cx + lo + L.knee + k, M.kneeY],
      [cx + lo + L.hem + k, L.hemY],
      [cx + lo - L.hem - k, L.hemY],
      [cx + lo - L.knee - k + 2, M.kneeY],
      [cx + 2, M.crotchY + 4],
      [cx - 2, M.crotchY + 4],
      [cx - lo + L.knee + k - 2, M.kneeY],
      [cx - lo + L.hem + k, L.hemY],
      [cx - lo - L.hem - k, L.hemY],
      [cx - lo - L.knee - k, M.kneeY],
      [cx - lo - L.thigh - k, 236],
      [cx - hipHalf, M.hipY],
    ]);
    maxWidth = Math.max(maxWidth, (lo + Math.max(L.thigh, L.hem) + k) * 2);
  }

  // ── 아우터 (앞을 연 두 패널) ─────────────────────
  let outer: [string, string] | null = null;
  let outerSleeves: [string, string] | null = null;
  const breakY = hemY;
  if (p.outer !== "none") {
    const oHem = p.outer === "short" ? Math.max(hemY + 8, 186) : 330;
    const oShoulder = shoulderX + 4;
    const oHemHalf = Math.max(hemHalf, bodyHalfAt(Math.min(oHem, M.crotchY))) + 8;
    const panel = (dir: -1 | 1): string =>
      pts([
        [cx + dir * 9, M.shoulderY - 5],
        [cx + dir * oShoulder, M.shoulderY + (ease.shoulderDrop > 6 ? 6 : 0)],
        [cx + dir * (chestHalf + 6), 112],
        [cx + dir * oHemHalf, oHem],
        [cx + dir * 12, oHem],
        [cx + dir * 12, 120],
      ]);
    outer = [panel(-1), panel(1)];
    outerSleeves = [sleeve(-1, 3), sleeve(1, 3)];
    maxWidth = Math.max(maxWidth, oHemHalf * 2);
    // 앞을 연 아우터는 안쪽 상의·허리선 경계가 그대로 보이므로 경계는 바꾸지 않음
  }

  const total = M.floorY - M.headTop;
  const upper = Math.round(((breakY - M.headTop) / total) * 100);
  return {
    top,
    sleeves: [sleeve(-1), sleeve(1)],
    bottom,
    outer,
    outerSleeves,
    breakY,
    split: { upper, lower: 100 - upper },
    maxWidth: r(maxWidth),
    tucked,
  };
}

// ── 코디 → 실루엣 비교 조건 ─────────────────────────

const TOP_LEN_BY_SHAPE: Partial<Record<Garment["shape"], TopLength>> = {
  "knit-crop": "crop",
  tee: "hip",
  shirt: "hip",
  knit: "hip",
  blouse: "waist",
  turtleneck: "hip",
  polo: "hip",
};
const BOTTOM_BY_SHAPE: Partial<Record<Garment["shape"], BottomShape>> = {
  "pants-straight": "straight",
  "pants-wide": "wide",
  "pants-tapered": "tapered",
  "skirt-pencil": "skirt",
  "skirt-flare": "skirt",
  "skirt-long": "skirt",
};
const OUTER_BY_SHAPE: Partial<Record<Garment["shape"], OuterKind>> = {
  jacket: "short",
  "jacket-short": "short",
  "jacket-oversized": "short",
  cardigan: "short",
  blouson: "short",
  coat: "long",
  trench: "long",
};

/** 코디를 실루엣 비교 조건으로 변환 (도해 근사) */
export function fitLabParamsFromOutfit(outfit: Pick<Outfit, "items">): { params: FitLabParams; fit: FitClass } {
  const g = outfit.items.map((i) => i.garment);
  const top = g.find((x) => x.slot === "top");
  const bottom = g.find((x) => x.slot === "bottom");
  const dress = g.find((x) => x.slot === "dress");
  const outer = g.find((x) => x.slot === "outer");
  const belt = g.some((x) => x.shape === "belt");
  const highRise = !!bottom?.attrs.waist?.includes("하이");
  const params: FitLabParams = {
    topLength: (top && TOP_LEN_BY_SHAPE[top.shape]) ?? "hip",
    waistLine: dress ? (belt ? "high" : "natural") : highRise || belt ? "high" : top?.fitClass === "over" ? "untucked" : "natural",
    bottom: dress ? "skirt" : (bottom && BOTTOM_BY_SHAPE[bottom.shape]) ?? "straight",
    outer: (outer && OUTER_BY_SHAPE[outer.shape]) ?? "none",
  };
  return { params, fit: top?.fitClass ?? dress?.fitClass ?? "regular" };
}

export function fitLabQuery(params: FitLabParams, fit?: FitClass): string {
  const q = new URLSearchParams({ top: params.topLength, waist: params.waistLine, bottom: params.bottom, outer: params.outer });
  if (fit) q.set("focus", fit);
  return q.toString();
}

export function fitLabHrefForOutfit(outfit: Pick<Outfit, "items">): string {
  const { params, fit } = fitLabParamsFromOutfit(outfit);
  return `/fit-lab?${fitLabQuery(params, fit)}`;
}

/** URL 쿼리 → 조건 (잘못된 값은 기본값) */
export function parseFitLabQuery(get: (k: string) => string | null): { params: FitLabParams; focus: FitClass | null } {
  const pick = <T extends string>(v: string | null, labels: Record<T, string>, d: T): T => (v && v in labels ? (v as T) : d);
  const focus = get("focus");
  return {
    params: {
      topLength: pick(get("top"), TOP_LENGTH_LABEL, DEFAULT_FITLAB.topLength),
      waistLine: pick(get("waist"), WAIST_LABEL, DEFAULT_FITLAB.waistLine),
      bottom: pick(get("bottom"), BOTTOM_LABEL, DEFAULT_FITLAB.bottom),
      outer: pick(get("outer"), OUTER_LABEL, DEFAULT_FITLAB.outer),
    },
    focus: focus === "slim" || focus === "regular" || focus === "over" ? focus : null,
  };
}
