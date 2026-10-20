import type { FeatureId } from "../analysis/features";
import type { TypeScores } from "./types";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  FRAME FIT 골격 유형 경향 판정 규칙 (설정 파일)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  ⚠️ 검증되지 않은 초기 휴리스틱입니다.
 *  - 아래 임계값(low/high)과 가중치는 일반적인 골격 유형 설명을 바탕으로 정한 "출발점"이며,
 *    통계적으로 검증된 데이터셋이나 전문가 판정과 대조해 보정한 값이 아닙니다.
 *  - 점수는 규칙이 몇 번, 얼마나 강하게 일치했는지를 더한 값일 뿐,
 *    확률·정확도·신뢰도(%)로 해석해서는 안 됩니다.
 *  - 포즈 랜드마크는 관절 중심의 2D 추정치이므로 골격 유형을 확정할 수 없습니다.
 *    따라서 사진 기반 점수의 비중은 자가 체크보다 낮게 둡니다.
 *
 *  값을 바꾸면 src/lib/classifier/__tests__/engine.test.ts 를 함께 갱신하세요.
 */

export const RULES_VERSION = "0.1.0-unvalidated";

export interface VisualRule {
  feature: FeatureId;
  /** 이 값 미만이면 whenLow 적용 */
  low: number;
  /** 이 값 초과면 whenHigh 적용 (low~high 사이는 중립) */
  high: number;
  whenLow: Partial<TypeScores>;
  whenHigh: Partial<TypeScores>;
  /** 최종 기여 = 위 점수 × weight × (품질 배수) */
  weight: number;
  lowText: string;
  highText: string;
  neutralText: string;
  /** true면 사용자가 "몸에 붙는 옷"을 입었다고 표시한 경우에만 점수 반영 */
  requiresFittedClothing?: boolean;
  caution?: string;
}

export const VISUAL_RULES: VisualRule[] = [
  {
    feature: "shoulderHipRatio",
    low: 1.35,
    high: 1.6,
    whenLow: { wave: 1 },
    whenHigh: { straight: 0.5, natural: 0.7 },
    weight: 1,
    lowText: "어깨 관절 폭이 골반 관절 폭에 비해 상대적으로 좁게 측정되었어요.",
    highText: "어깨 관절 폭이 골반 관절 폭에 비해 상대적으로 넓게 측정되었어요.",
    neutralText: "어깨와 골반 관절 폭의 비율이 중간 범위예요.",
  },
  {
    feature: "torsoLegRatio",
    low: 0.56,
    high: 0.64,
    whenLow: { straight: 0.7, natural: 0.3 },
    whenHigh: { wave: 1 },
    weight: 1,
    lowText: "골반선이 상대적으로 높은 위치에 있어요(몸통 대비 다리 비중이 큼).",
    highText: "골반선이 상대적으로 낮은 위치에 있어 시각적 중심이 아래쪽으로 보일 수 있어요.",
    neutralText: "몸통과 다리 길이의 비율이 중간 범위예요.",
  },
  {
    feature: "shoulderTorsoRatio",
    low: 0.62,
    high: 0.74,
    whenLow: { wave: 0.6 },
    whenHigh: { natural: 1 },
    weight: 0.8,
    lowText: "몸통 길이에 비해 어깨 프레임이 컴팩트하게 측정되었어요.",
    highText: "몸통 길이에 비해 어깨 프레임이 넓게 측정되었어요(프레임감이 드러나는 쪽).",
    neutralText: "몸통 대비 어깨 프레임 폭이 중간 범위예요.",
    caution: "몸을 조금만 돌려도 값이 작아질 수 있어요.",
  },
  {
    feature: "silhouetteWaistHipRatio",
    low: 0.76,
    high: 0.88,
    whenLow: { wave: 1 },
    whenHigh: { natural: 0.6, straight: 0.4 },
    weight: 0.6,
    lowText: "윤곽상 허리 쪽이 들어가 보이는 곡선형 실루엣이에요.",
    highText: "윤곽상 허리와 엉덩이 폭 차이가 작은 직선형 실루엣이에요.",
    neutralText: "윤곽상 허리-엉덩이 폭 차이가 중간 범위예요.",
    caution: "옷의 핏(오버핏·허리 라인)에 따라 크게 달라져요.",
  },
  {
    feature: "silhouetteShoulderHipRatio",
    low: 1.0,
    high: 1.15,
    whenLow: { wave: 0.8 },
    whenHigh: { straight: 0.6, natural: 0.4 },
    weight: 0.6,
    lowText: "윤곽상 하체 폭이 상체 폭과 비슷하거나 넓게 보여 시각적 무게가 아래쪽이에요.",
    highText: "윤곽상 상체 폭이 하체보다 넓게 보여 시각적 무게가 위쪽이에요.",
    neutralText: "윤곽상 상하체 폭의 균형이 중간 범위예요.",
    caution: "어깨 패드, 소재 두께, 하의 형태에 영향을 받아요.",
  },
  {
    feature: "sideUpperDepthRatio",
    low: 0.42,
    high: 0.52,
    whenLow: { wave: 0.6 },
    whenHigh: { straight: 0.8 },
    weight: 0.5,
    requiresFittedClothing: true,
    lowText: "측면 윤곽상 상체 앞뒤 폭이 얇은 편으로 보여요.",
    highText: "측면 윤곽상 상체 앞뒤 폭이 두터운 편으로 보여요.",
    neutralText: "측면 윤곽상 상체 앞뒤 폭이 중간 범위예요.",
    caution: "옷 두께와 신체 두께를 구분할 수 없어요. 몸에 붙는 옷을 입었다고 표시한 경우에만 낮은 비중으로 반영해요.",
  },
];

export interface DecisionConfig {
  /** 자가 체크 응답(잘 모르겠음 제외)이 이보다 적으면 판정 보류 */
  minSelfAnswers: number;
  /** 1위 유형 점수가 이보다 낮으면 판정 보류 */
  minTopScore: number;
  /** (1위-2위)/1위 가 이보다 작으면 혼합형 */
  mixedMarginRatio: number;
  /** 사진 근거와 자가 체크 근거의 1위가 다를 때 적용하는 혼합형 기준 */
  conflictMixedMarginRatio: number;
  /** 사진 근거 1위로 인정하는 최소 점수 (충돌 판단용) */
  conflictVisualMin: number;
  /** 품질별 사진 근거 배수 */
  qualityMultiplier: Record<"good" | "fair" | "poor" | "none", number>;
  /** 사진/자가 체크 근거 배수 */
  visualWeight: number;
  selfWeight: number;
  /** 근거 강도 기준 */
  strongMinAnswers: number;
  strongMinMargin: number;
}

export const DECISION: DecisionConfig = {
  minSelfAnswers: 4,
  minTopScore: 3,
  mixedMarginRatio: 0.15,
  conflictMixedMarginRatio: 0.25,
  conflictVisualMin: 1,
  qualityMultiplier: { good: 1, fair: 0.6, poor: 0, none: 0 },
  visualWeight: 1,
  selfWeight: 1,
  strongMinAnswers: 7,
  strongMinMargin: 0.3,
};
