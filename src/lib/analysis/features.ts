import { LM, dist, mid, toPx, type PoseLandmark, type Pt } from "../pose/landmarks";
import { rowRunAt, scanRuns, type MaskData, type RowRun } from "../pose/mask";
import type { CaptureView } from "../pose/quality";

/**
 * 사진에서 실제로 계산 가능한 특징만 다룹니다.
 * - 모든 값은 무단위 비율입니다. cm, kg, 체지방률 등은 계산하지 않습니다.
 * - 2D 랜드마크는 관절 중심 추정치이며, 실루엣은 옷을 포함한 외형입니다.
 */

export type FeatureId =
  | "shoulderHipRatio"
  | "torsoLegRatio"
  | "shoulderTorsoRatio"
  | "silhouetteWaistHipRatio"
  | "silhouetteShoulderHipRatio"
  | "sideUpperDepthRatio"
  | "sideWaistDepthRatio";

export interface VisualFeature {
  id: FeatureId;
  label: string;
  value: number;
  source: "landmark" | "silhouette";
  view: CaptureView;
  clothingSensitive: boolean;
  description: string;
}

export interface SilhouetteRow {
  y: number; // 정규화 y
  left: number; // 정규화 x
  right: number;
}

/** 오버레이 시각화용 측정선 (정규화 좌표) */
export interface MeasurementLines {
  shoulderLine?: [Pt, Pt];
  hipLine?: [Pt, Pt];
  torso?: [Pt, Pt];
  leg?: [Pt, Pt];
  silhouette?: Partial<Record<"shoulder" | "waist" | "hip" | "upperDepth" | "waistDepth", SilhouetteRow>>;
}

export interface ViewFeatures {
  view: CaptureView;
  features: VisualFeature[];
  lines: MeasurementLines;
  notes: string[];
}

/** 사진만으로는 관찰·추정할 수 없는 항목 (결과 화면에 명시) */
export const NOT_OBSERVABLE: ReadonlyArray<{ label: string; reason: string }> = [
  { label: "쇄골의 돌출 정도", reason: "포즈 모델은 뼈의 형태를 검출하지 않아요." },
  { label: "근육·지방의 실제 분포", reason: "사진의 외형만으로는 조직 구성을 알 수 없어요." },
  { label: "옷 아래의 실제 신체 두께", reason: "실루엣에는 옷의 두께가 함께 포함돼요." },
  { label: "손목·관절의 크기와 단면", reason: "관절 위치만 추정할 뿐 크기는 측정하지 않아요." },
  { label: "피부와 조직의 질감·탄력", reason: "영상 기반으로 판단하지 않아요." },
  { label: "키·둘레 등 실제 치수(cm), 체중, 체지방률", reason: "기준 물체 없이 실제 크기를 계산할 수 없어 산출하지 않아요." },
];

function px(l: PoseLandmark[], i: number, W: number, H: number): Pt {
  return toPx(l[i], W, H);
}

function norm(p: Pt, W: number, H: number): Pt {
  return { x: p.x / W, y: p.y / H };
}

function round(v: number, d = 3): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

export function computeFrontFeatures(
  l: PoseLandmark[],
  W: number,
  H: number,
  mask?: MaskData | null,
): ViewFeatures {
  const notes: string[] = [];
  const ls = px(l, LM.LEFT_SHOULDER, W, H);
  const rs = px(l, LM.RIGHT_SHOULDER, W, H);
  const lh = px(l, LM.LEFT_HIP, W, H);
  const rh = px(l, LM.RIGHT_HIP, W, H);
  const lk = px(l, LM.LEFT_KNEE, W, H);
  const rk = px(l, LM.RIGHT_KNEE, W, H);
  const la = px(l, LM.LEFT_ANKLE, W, H);
  const ra = px(l, LM.RIGHT_ANKLE, W, H);

  const sm = mid(ls, rs);
  const hm = mid(lh, rh);
  const am = mid(la, ra);
  const shoulderW = dist(ls, rs);
  const hipW = dist(lh, rh);
  const torso = dist(sm, hm);
  // 다리 길이: 무릎이 약간 굽어도 안정적이도록 좌우 (골반-무릎 + 무릎-발목) 평균
  const leg = (dist(lh, lk) + dist(lk, la) + dist(rh, rk) + dist(rk, ra)) / 2;

  const features: VisualFeature[] = [];
  if (hipW > 1 && torso > 1 && leg > 1) {
    features.push(
      {
        id: "shoulderHipRatio",
        label: "어깨 관절 폭 ÷ 골반 관절 폭",
        value: round(shoulderW / hipW),
        source: "landmark",
        view: "front",
        clothingSensitive: false,
        description: "어깨 랜드마크 간 거리와 골반(고관절) 랜드마크 간 거리의 비율이에요. 골반 랜드마크는 엉덩이 바깥선이 아니라 관절 중심 추정치예요.",
      },
      {
        id: "torsoLegRatio",
        label: "몸통 길이 ÷ 다리 길이",
        value: round(torso / leg),
        source: "landmark",
        view: "front",
        clothingSensitive: false,
        description: "어깨 중심~골반 중심 거리와 골반~무릎~발목 거리의 비율이에요. 값이 클수록 골반선이 상대적으로 아래에 있어요.",
      },
      {
        id: "shoulderTorsoRatio",
        label: "어깨 관절 폭 ÷ 몸통 길이",
        value: round(shoulderW / torso),
        source: "landmark",
        view: "front",
        clothingSensitive: false,
        description: "몸통 길이 대비 어깨 프레임의 가로 폭이에요. 촬영 각도에 따라 달라질 수 있어요.",
      },
    );
  }

  const lines: MeasurementLines = {
    shoulderLine: [norm(ls, W, H), norm(rs, W, H)],
    hipLine: [norm(lh, W, H), norm(rh, W, H)],
    torso: [norm(sm, W, H), norm(hm, W, H)],
    leg: [norm(hm, W, H), norm(am, W, H)],
  };

  if (mask && torso > 1) {
    const centerX = (y: number) => {
      // 어깨 중심~골반 중심을 잇는 선 위의 x (정규화)
      const t = (y * H - sm.y) / Math.max(hm.y - sm.y, 1);
      return (sm.x + (hm.x - sm.x) * Math.min(Math.max(t, 0), 1.3)) / W;
    };
    const tY = (frac: number) => (sm.y + (hm.y - sm.y) * frac) / H;

    const shoulderRun = rowRunAt(mask, tY(0.04), centerX(tY(0.04)));
    const waistRows = scanRuns(mask, tY(0.45), tY(0.85), centerX, 10);
    const hipRows = scanRuns(mask, tY(0.95), tY(1.25), centerX, 8);

    const armsMerged = (rows: Array<{ y: number; run: RowRun }>) => {
      const joints = [LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST].map((i) => l[i]);
      return rows.some(({ y, run }) =>
        joints.some((j) => j.visibility > 0.5 && Math.abs(j.y - y) < 0.04 && j.x > run.left && j.x < run.right),
      );
    };

    const waist = waistRows.length ? waistRows.reduce((a, b) => (b.run.width < a.run.width ? b : a)) : null;
    const hip = hipRows.length ? hipRows.reduce((a, b) => (b.run.width > a.run.width ? b : a)) : null;
    const waistMerged = armsMerged(waistRows);
    const hipMerged = armsMerged(hipRows);

    lines.silhouette = {};
    if (shoulderRun) lines.silhouette.shoulder = { y: tY(0.04), left: shoulderRun.left, right: shoulderRun.right };
    if (waist && !waistMerged) lines.silhouette.waist = { y: waist.y, left: waist.run.left, right: waist.run.right };
    if (hip && !hipMerged) lines.silhouette.hip = { y: hip.y, left: hip.run.left, right: hip.run.right };

    if (waistMerged || hipMerged) {
      notes.push("팔이 몸통 옆에 붙어 있어 허리·엉덩이 윤곽 폭은 측정하지 않았어요. 팔을 몸에서 살짝 떨어뜨려 촬영하면 측정할 수 있어요.");
    }
    if (waist && hip && !waistMerged && !hipMerged && hip.run.width > 0) {
      features.push({
        id: "silhouetteWaistHipRatio",
        label: "윤곽 허리 폭 ÷ 윤곽 엉덩이 폭",
        value: round(waist.run.width / hip.run.width),
        source: "silhouette",
        view: "front",
        clothingSensitive: true,
        description: "인체 분할 윤곽에서 몸통 가장 좁은 폭과 골반 아래 가장 넓은 폭의 비율이에요. 옷의 핏에 크게 영향을 받아요.",
      });
    }
    if (shoulderRun && hip && !hipMerged && hip.run.width > 0) {
      features.push({
        id: "silhouetteShoulderHipRatio",
        label: "윤곽 어깨 폭 ÷ 윤곽 엉덩이 폭",
        value: round(shoulderRun.width / hip.run.width),
        source: "silhouette",
        view: "front",
        clothingSensitive: true,
        description: "윤곽 기준 상체 폭과 하체 폭의 비율이에요. 옷의 어깨 패드, 소재 두께, 하의 형태에 영향을 받아요.",
      });
    }
  } else if (!mask) {
    notes.push("인체 분할 마스크를 사용할 수 없어 윤곽 기반 특징은 계산하지 않았어요.");
  }

  return { view: "front", features, lines, notes };
}

export function computeSideFeatures(
  l: PoseLandmark[],
  W: number,
  H: number,
  mask?: MaskData | null,
): ViewFeatures {
  const notes = ["측면 윤곽은 옷을 포함한 외형이에요. 옷의 두께와 실제 신체 두께를 구분할 수 없어요."];
  const pick = (a: number, b: number) => (l[a].visibility >= l[b].visibility ? a : b);
  const s = px(l, pick(LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER), W, H);
  const h = px(l, pick(LM.LEFT_HIP, LM.RIGHT_HIP), W, H);
  const a = px(l, pick(LM.LEFT_ANKLE, LM.RIGHT_ANKLE), W, H);
  const torso = dist(s, h);
  const lines: MeasurementLines = {
    torso: [norm(s, W, H), norm(h, W, H)],
    leg: [norm(h, W, H), norm(a, W, H)],
  };
  const features: VisualFeature[] = [];
  if (!mask) {
    notes.push("인체 분할 마스크를 사용할 수 없어 측면 윤곽 깊이를 계산하지 않았어요.");
    return { view: "side", features, lines, notes };
  }
  if (torso < 1) return { view: "side", features, lines, notes };

  const centerX = (y: number) => {
    const t = (y * H - s.y) / Math.max(h.y - s.y, 1);
    return (s.x + (h.x - s.x) * Math.min(Math.max(t, 0), 1)) / W;
  };
  const tY = (frac: number) => (s.y + (h.y - s.y) * frac) / H;
  const upper = rowRunAt(mask, tY(0.28), centerX(tY(0.28)));
  const waistRows = scanRuns(mask, tY(0.5), tY(0.85), centerX, 8);
  const waist = waistRows.length ? waistRows.reduce((p, c) => (c.run.width < p.run.width ? c : p)) : null;

  lines.silhouette = {};
  if (upper) {
    lines.silhouette.upperDepth = { y: tY(0.28), left: upper.left, right: upper.right };
    features.push({
      id: "sideUpperDepthRatio",
      label: "측면 상체 윤곽 깊이 ÷ 몸통 길이",
      value: round((upper.width * W) / torso),
      source: "silhouette",
      view: "side",
      clothingSensitive: true,
      description: "가슴 높이에서 측면 윤곽의 앞뒤 폭을 몸통 길이로 나눈 값이에요. 옷 두께가 포함돼요.",
    });
  }
  if (waist) {
    lines.silhouette.waistDepth = { y: waist.y, left: waist.run.left, right: waist.run.right };
    features.push({
      id: "sideWaistDepthRatio",
      label: "측면 허리 윤곽 깊이 ÷ 몸통 길이",
      value: round((waist.run.width * W) / torso),
      source: "silhouette",
      view: "side",
      clothingSensitive: true,
      description: "허리 높이에서 측면 윤곽의 가장 얇은 앞뒤 폭이에요. 옷 두께가 포함돼요.",
    });
  }
  return { view: "side", features, lines, notes };
}
