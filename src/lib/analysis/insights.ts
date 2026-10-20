import { VISUAL_RULES } from "../classifier/rules.config";
import { QUESTIONS, UNKNOWN_OPTION_ID } from "../classifier/questions.config";
import type { SelfAnswer } from "../classifier/types";
import { LM, type PoseLandmark } from "../pose/landmarks";
import type { FeatureId, ViewFeatures } from "./features";

/**
 * 체형 비율 맵 데이터 — 부위별 관찰 결과와 코디 관련 설명.
 * - measured=true: 사진에서 실제로 계산한 비율 (단위 없음)
 * - measured=false: 카메라로 측정하지 않는 특징. 값이 아니라 자가 체크 응답만 보여 줌
 * 구간(낮음/중간/높음)은 판정 규칙의 검증되지 않은 참고 구간이며, 좋고 나쁨이 아닙니다.
 */

export type InsightPart = "shoulder" | "balance" | "proportion" | "waist" | "weight" | "side" | "collarbone" | "chest" | "wrist" | "knee";
export type Band = "low" | "neutral" | "high";

export interface BodyInsight {
  part: InsightPart;
  title: string;
  measured: boolean;
  /** 측정값 (measured일 때만) */
  value?: number;
  band?: Band;
  bandLabel?: string;
  observation: string;
  styling: string;
  caution?: string;
  /** 측정하지 않는 항목의 자가 체크 응답 */
  selfAnswer?: string;
  /** 도식 위 위치 (정규화 좌표). 없으면 목록에만 표시 */
  anchor: { x: number; y: number } | null;
}

interface FeatureCopy {
  part: InsightPart;
  title: string;
  observation: Record<Band, string>;
  styling: Record<Band, string>;
  caution?: string;
}

export const FEATURE_INSIGHTS: Partial<Record<FeatureId, FeatureCopy>> = {
  shoulderTorsoRatio: {
    part: "shoulder",
    title: "어깨선",
    observation: {
      low: "몸통 길이에 비해 어깨 프레임이 컴팩트하게 측정되었어요.",
      neutral: "몸통 길이 대비 어깨 프레임이 중간 범위로 측정되었어요.",
      high: "몸통 길이에 비해 어깨 프레임이 넓게 측정되었어요.",
    },
    styling: {
      low: "보트넥, 어깨 디테일, 어깨선이 맞는 재킷이 상체에 존재감을 더해요.",
      neutral: "어깨선이 맞는 기본 핏이면 충분해요. 여유를 원하면 살짝 드롭 숄더를 골라 보세요.",
      high: "드롭 숄더나 래글런 소매가 어깨 프레임을 자연스럽게 감싸고, V넥이 세로 시선을 만들어요.",
    },
    caution: "몸을 조금만 돌려도 값이 작아질 수 있어요.",
  },
  shoulderHipRatio: {
    part: "balance",
    title: "어깨·골반 균형",
    observation: {
      low: "어깨 관절 폭이 골반 관절 폭에 비해 좁은 편으로 측정되었어요.",
      neutral: "어깨와 골반 관절 폭의 비율이 중간 범위예요.",
      high: "어깨 관절 폭이 골반 관절 폭에 비해 넓은 편으로 측정되었어요.",
    },
    styling: {
      low: "상의에 볼륨(퍼프 소매·보트넥·밝은 색)을 두고 하의를 매끈하게 하면 상하 균형이 맞아요.",
      neutral: "상하 볼륨을 비슷하게 맞추면 균형감이 유지돼요.",
      high: "하의에 볼륨(와이드·A라인)을 두고 상의는 V넥·세로 디테일로 정돈하면 균형감이 생겨요.",
    },
    caution: "골반 랜드마크는 엉덩이 바깥선이 아니라 고관절 중심 추정치예요.",
  },
  torsoLegRatio: {
    part: "proportion",
    title: "상하체 비율",
    observation: {
      low: "몸통에 비해 다리 비중이 크게 측정되었어요. 골반선이 상대적으로 높은 위치예요.",
      neutral: "몸통과 다리 길이의 비율이 중간 범위예요.",
      high: "몸통에 비해 다리 비중이 작게 측정되었어요. 골반선이 상대적으로 낮은 위치예요.",
    },
    styling: {
      low: "상의를 길게 빼 입거나 미드라이즈를 입어도 비율이 자연스러워요. 롱 아우터도 잘 어울려요.",
      neutral: "허리선을 높이면 길어 보이는 효과가, 빼 입으면 편안한 인상이 나요.",
      high: "하이웨이스트, 짧은 상의, 넣어 입기로 허리선을 올리면 다리가 길어 보여요. 하의와 신발 색을 맞추면 효과가 커져요.",
    },
  },
  silhouetteWaistHipRatio: {
    part: "waist",
    title: "허리 윤곽",
    observation: {
      low: "윤곽상 허리 쪽이 들어가 보이는 곡선형 실루엣이에요.",
      neutral: "윤곽상 허리-엉덩이 폭 차이가 중간 범위예요.",
      high: "윤곽상 허리와 엉덩이 폭 차이가 작은 직선형 실루엣이에요.",
    },
    styling: {
      low: "벨트, 랩 디자인처럼 허리선을 표시하는 아이템이 곡선을 살려요.",
      neutral: "허리선을 표시할지, 일자로 떨어뜨릴지 원하는 효과에 따라 골라 보세요.",
      high: "허리를 조이기보다 일자로 떨어지는 핏이나 세로 라인을 만드는 롱 아우터가 자연스러워요.",
    },
    caution: "옷을 포함한 외형이라 옷의 핏에 따라 크게 달라져요.",
  },
  silhouetteShoulderHipRatio: {
    part: "weight",
    title: "상하체 윤곽 무게",
    observation: {
      low: "윤곽상 하체 폭이 상체와 비슷하거나 넓어 시각적 무게가 아래쪽이에요.",
      neutral: "윤곽상 상하체 폭의 균형이 중간 범위예요.",
      high: "윤곽상 상체 폭이 하체보다 넓어 시각적 무게가 위쪽이에요.",
    },
    styling: {
      low: "상의에 밝은 색이나 디테일을 두어 시선을 위로 올리면 균형이 맞아요.",
      neutral: "포인트를 한 곳에만 두면 실루엣이 정돈돼요.",
      high: "상의는 간결하게, 하의에 질감이나 볼륨을 두어 무게를 나눠 보세요.",
    },
    caution: "어깨 패드, 소재 두께, 하의 형태에 영향을 받아요.",
  },
  sideUpperDepthRatio: {
    part: "side",
    title: "측면 상체 윤곽",
    observation: {
      low: "측면 윤곽상 상체 앞뒤 폭이 얇은 편으로 보여요.",
      neutral: "측면 윤곽상 상체 앞뒤 폭이 중간 범위예요.",
      high: "측면 윤곽상 상체 앞뒤 폭이 두터운 편으로 보여요.",
    },
    styling: {
      low: "질감 있는 소재나 가벼운 레이어드가 상체에 입체감을 더해요.",
      neutral: "소재 두께로 상체 볼륨을 조절해 보세요.",
      high: "얇은 하이게이지 니트, V넥처럼 매끈한 소재가 상체를 정돈해요.",
    },
    caution: "옷 두께와 실제 신체 두께를 구분할 수 없어요.",
  },
};

interface SelfCopy {
  part: InsightPart;
  title: string;
  questionId: string;
  reason: string;
  styling: Record<string, string>;
}

/** 카메라로 측정하지 않는 특징 — 자가 체크 응답으로만 설명 */
export const SELF_INSIGHTS: SelfCopy[] = [
  {
    part: "collarbone",
    title: "쇄골",
    questionId: "collarbone",
    reason: "포즈 모델은 뼈의 형태를 검출하지 않아요.",
    styling: {
      subtle: "V넥이나 셔츠 칼라로 목선에 세로 여백을 만들면 깔끔해요.",
      fine: "보우·작은 칼라처럼 목 주변의 섬세한 디테일이 잘 어울려요.",
      prominent: "오픈 칼라나 넉넉한 넥라인이 프레임과 자연스럽게 어울려요.",
    },
  },
  {
    part: "chest",
    title: "상체 앞뒤 두께",
    questionId: "torso-depth",
    reason: "사진의 윤곽에는 옷 두께가 포함되어 신체 두께를 측정하지 않아요.",
    styling: {
      thick: "얇은 하이게이지 소재와 V넥이 상체를 매끈하게 정돈해요.",
      thin: "질감 있는 소재나 가벼운 레이어드가 상체에 볼륨을 더해요.",
      frame: "여유 있는 핏과 구조적인 레이어드가 프레임과 어울려요.",
    },
  },
  {
    part: "wrist",
    title: "손목",
    questionId: "wrist",
    reason: "관절 위치만 추정할 뿐, 손목의 굵기나 단면은 측정하지 않아요.",
    styling: {
      round: "단정한 메탈 시계나 얇은 체인 팔찌가 잘 어울려요.",
      flat: "가늘고 작은 액세서리가 섬세한 인상을 살려요.",
      bony: "굵은 가죽 스트랩이나 존재감 있는 뱅글이 자연스러워요.",
    },
  },
  {
    part: "knee",
    title: "무릎",
    questionId: "knee",
    reason: "무릎 관절 위치는 추정하지만 무릎뼈의 크기나 형태는 측정하지 않아요.",
    styling: {
      small: "무릎 기장 스커트나 크롭 팬츠도 깔끔하게 어울려요.",
      soft: "무릎 아래로 내려오는 미디 기장이 부드러운 인상을 줘요.",
      large: "발목까지 오는 긴 기장이나 와이드 팬츠가 자연스러워요.",
    },
  },
];

const BAND_LABEL: Record<Band, string> = {
  low: "참고 구간보다 낮음",
  neutral: "참고 구간 안",
  high: "참고 구간보다 높음",
};

export function bandOf(featureId: FeatureId, value: number): Band {
  const rule = VISUAL_RULES.find((r) => r.feature === featureId);
  if (!rule) return "neutral";
  return value < rule.low ? "low" : value > rule.high ? "high" : "neutral";
}

function mid(a: PoseLandmark, b: PoseLandmark) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 각 항목을 도식 위 어디에 표시할지 (정규화 좌표) */
function anchorFor(part: InsightPart, l: PoseLandmark[] | null, features: ViewFeatures | null): { x: number; y: number } | null {
  if (!l) return null;
  const sm = mid(l[LM.LEFT_SHOULDER], l[LM.RIGHT_SHOULDER]);
  const hm = mid(l[LM.LEFT_HIP], l[LM.RIGHT_HIP]);
  // 라벨이 겹치지 않도록 왼쪽(이미지 기준): 어깨선·상하체 비율·손목, 가운데: 쇄골·상체 두께·골반선, 오른쪽: 허리·윤곽 무게·무릎
  const imgLeft = <T extends PoseLandmark>(a: T, b: T) => (a.x < b.x ? a : b);
  const imgRight = <T extends PoseLandmark>(a: T, b: T) => (a.x > b.x ? a : b);
  const leftShoulder = imgLeft(l[LM.LEFT_SHOULDER], l[LM.RIGHT_SHOULDER]);
  const leftKnee = imgLeft(l[LM.LEFT_KNEE], l[LM.RIGHT_KNEE]);
  switch (part) {
    case "shoulder":
      return { x: leftShoulder.x, y: leftShoulder.y };
    case "collarbone":
      return { x: sm.x, y: sm.y + (hm.y - sm.y) * 0.08 };
    case "chest":
      return { x: sm.x, y: sm.y + (hm.y - sm.y) * 0.38 };
    case "balance":
      return { x: hm.x, y: hm.y };
    case "proportion":
      return { x: leftKnee.x - 0.03, y: hm.y + (leftKnee.y - hm.y) * 0.5 };
    case "waist": {
      const row = features?.lines.silhouette?.waist;
      return row ? { x: row.right, y: row.y } : null;
    }
    case "weight": {
      const row = features?.lines.silhouette?.hip;
      return row ? { x: row.right, y: row.y + 0.02 } : null;
    }
    case "wrist": {
      const w = imgLeft(l[LM.LEFT_WRIST], l[LM.RIGHT_WRIST]);
      return { x: w.x, y: w.y };
    }
    case "knee": {
      const k = imgRight(l[LM.LEFT_KNEE], l[LM.RIGHT_KNEE]);
      return { x: k.x, y: k.y };
    }
    default:
      return null;
  }
}

export function buildInsights(args: {
  frontLandmarks: PoseLandmark[] | null;
  front: ViewFeatures | null;
  side: ViewFeatures | null;
  answers: SelfAnswer[];
}): BodyInsight[] {
  const out: BodyInsight[] = [];
  for (const vf of [args.front, args.side]) {
    if (!vf) continue;
    for (const f of vf.features) {
      const copy = FEATURE_INSIGHTS[f.id];
      if (!copy) continue;
      const band = bandOf(f.id, f.value);
      out.push({
        part: copy.part,
        title: copy.title,
        measured: true,
        value: f.value,
        band,
        bandLabel: BAND_LABEL[band],
        observation: copy.observation[band],
        styling: copy.styling[band],
        caution: copy.caution,
        anchor: vf.view === "front" ? anchorFor(copy.part, args.frontLandmarks, args.front) : null,
      });
    }
  }
  for (const s of SELF_INSIGHTS) {
    const a = args.answers.find((x) => x.questionId === s.questionId);
    const q = QUESTIONS.find((x) => x.id === s.questionId);
    const opt = a && a.optionId !== UNKNOWN_OPTION_ID ? q?.options.find((o) => o.id === a.optionId) : undefined;
    out.push({
      part: s.part,
      title: s.title,
      measured: false,
      observation: `카메라로 측정하지 않는 특징이에요. ${s.reason}`,
      selfAnswer: opt ? opt.label : a?.optionId === UNKNOWN_OPTION_ID ? "잘 모르겠어요" : "아직 체크하지 않았어요",
      styling: opt ? s.styling[opt.id] ?? "" : "보완 체크에서 답하면 이 부위와 관련된 코디 팁을 보여 드려요.",
      anchor: anchorFor(s.part, args.frontLandmarks, args.front),
    });
  }
  return out;
}
