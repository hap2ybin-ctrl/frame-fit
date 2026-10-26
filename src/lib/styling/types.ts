import type { BodyType, TypeScores } from "../classifier/types";
import type { PersonalColor } from "./personalColor";

export type StyleLine = "women" | "men" | "unisex";
/** casual=일상, business=출근, date=데이트, formal=행사, travel=여행 */
export type Occasion = "casual" | "business" | "date" | "formal" | "travel";
/** 원하는 효과: 균형감 / 길어 보이는 비율 / 볼륨감 / 단정함 */
export type SilhouetteGoal = "balance" | "long" | "volume" | "neat";
export type FocusArea = "shoulder" | "neck" | "waist" | "legs";
export type Taste = "minimal" | "classic" | "casual" | "street" | "formal";
/** 의복 핏 분류 (실루엣 비교·선호 핏 기록에 사용) */
export type FitClass = "slim" | "regular" | "over";
export type Slot = "top" | "bottom" | "dress" | "outer" | "shoes" | "accessory";

export type GarmentShape =
  | "shirt"
  | "tee"
  | "knit"
  | "knit-crop"
  | "blouse"
  | "turtleneck"
  | "polo"
  | "jacket"
  | "jacket-short"
  | "jacket-oversized"
  | "coat"
  | "trench"
  | "cardigan"
  | "blouson"
  | "pants-straight"
  | "pants-wide"
  | "pants-tapered"
  | "skirt-pencil"
  | "skirt-flare"
  | "skirt-long"
  | "dress-wrap"
  | "dress-shirt"
  | "dress-maxi"
  | "loafer"
  | "sneaker"
  | "heel"
  | "boots"
  | "derby"
  | "belt"
  | "bag"
  | "scarf";

export interface GarmentAttrs {
  neckline?: string;
  length?: string;
  waist?: string;
  fit?: string;
  fabric?: string;
  pattern?: string;
  layering?: string;
}

export interface Garment {
  id: string;
  name: string;
  slot: Slot;
  lines: StyleLine[];
  /** 유형별 어울림 정도 0~2 (검증되지 않은 초기값) */
  affinity: TypeScores;
  occasions: Occasion[];
  goals: SilhouetteGoal[];
  focus: FocusArea[];
  tastes: Taste[];
  attrs: GarmentAttrs;
  /** 핏 분류 (신발·소품은 없음) */
  fitClass?: FitClass;
  /** 옷장 체크 항목과 연결되는 키 */
  closetKey: string;
  shape: GarmentShape;
  color: string;
  /** 유형별로 왜 어울리는지 / 어떻게 입으면 좋은지 */
  why: Record<BodyType, string>;
  /** 노리는 효과 */
  effect: string;
  /** 원하지 않을 경우 대안 */
  alternative: string;
}

export interface StylePreferences {
  line: StyleLine;
  occasions: Occasion[];
  goals: SilhouetteGoal[];
  focus: FocusArea[];
  tastes: Taste[];
  /** 사용자가 알고 있는 퍼스널 컬러 (모르면 null) */
  personalColor?: PersonalColor | null;
}

/** 코디 추천의 유형 기준 */
export type TypeMode = "auto" | "straight" | "wave" | "natural" | "mixed";

export interface OutfitItem {
  garment: Garment;
  why: string;
  matched: string[];
}

export interface Outfit {
  id: string;
  /** 상의+하의(또는 원피스) 조합 키 — 코디 제외·저장에 사용 */
  coreKey: string;
  title: string;
  occasion: Occasion;
  concept: string;
  items: OutfitItem[];
  effect: string;
  /** 코디 전체 추천 이유 */
  reason: string;
  /** 핏 조절 방법 */
  fitTips: string[];
  score: number;
  /** 옷장 기반 조합이면 true */
  fromCloset: boolean;
  /** 완성 룩 큐레이션에서 온 코디면 모델컷 이미지 키와 모델 체형 */
  look?: { id: string; image: string; gender: "women" | "men"; bodyType: BodyType | "neutral" };
  /** 옷장 조합에서 추가하면 좋은 아이템 */
  missing?: Garment[];
}

export interface StylePoint {
  aspect: "neckline" | "length" | "waist" | "jacket" | "pants" | "fabric" | "pattern" | "layering";
  label: string;
  recommendation: string;
  why: string;
  effect: string;
  alternative: string;
}
