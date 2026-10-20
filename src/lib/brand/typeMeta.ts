import type { BodyType, Classification } from "../classifier/types";

export interface TypeMeta {
  key: BodyType;
  label: string;
  en: string;
  hex: string;
  softHex: string;
  /** Tailwind 클래스 (정적 문자열이어야 빌드 시 포함됨) */
  text: string;
  bg: string;
  bgSoft: string;
  border: string;
  summary: string;
  traits: string[];
}

export const TYPE_META: Record<BodyType, TypeMeta> = {
  straight: {
    key: "straight",
    label: "스트레이트",
    en: "STRAIGHT",
    hex: "#D16A89",
    softHex: "#FBEAF0",
    text: "text-straight",
    bg: "bg-straight",
    bgSoft: "bg-straight-soft",
    border: "border-straight",
    summary: "입체감 있는 상체와 탄탄한 실루엣으로 설명되는 경향",
    traits: ["입체적인 상체", "비교적 두께감 있는 흉곽", "탄탄한 실루엣"],
  },
  wave: {
    key: "wave",
    label: "웨이브",
    en: "WAVE",
    hex: "#6E99CF",
    softHex: "#EAF1FA",
    text: "text-wave",
    bg: "bg-wave",
    bgSoft: "bg-wave-soft",
    border: "border-wave",
    summary: "얇은 상체와 부드러운 곡선, 낮은 시각적 중심으로 설명되는 경향",
    traits: ["비교적 얇은 상체", "부드러운 곡선", "상대적으로 낮은 시각적 중심"],
  },
  natural: {
    key: "natural",
    label: "내추럴",
    en: "NATURAL",
    hex: "#7D9A78",
    softHex: "#EDF2EA",
    text: "text-natural",
    bg: "bg-natural",
    bgSoft: "bg-natural-soft",
    border: "border-natural",
    summary: "골격 프레임과 관절의 존재감, 직선적 실루엣으로 설명되는 경향",
    traits: ["쇄골·관절의 존재감", "구조적인 골격 프레임", "직선적인 실루엣"],
  },
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  straight: "스트레이트 경향",
  wave: "웨이브 경향",
  natural: "내추럴 경향",
  mixed: "혼합형",
  inconclusive: "판정 보류",
};

export const STRENGTH_LABEL = {
  strong: "근거 충분",
  moderate: "근거 보통",
  weak: "근거 부족",
} as const;
