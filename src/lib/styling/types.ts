import type { BodyType, TypeScores } from "../classifier/types";

export type StyleLine = "women" | "men" | "unisex";
export type Occasion = "casual" | "business" | "date" | "formal";
export type SilhouetteGoal = "neat" | "volume" | "long" | "comfort";
export type FocusArea = "shoulder" | "neck" | "waist" | "legs";
export type Taste = "minimal" | "classic" | "soft" | "street" | "natural";
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
}

export interface OutfitItem {
  garment: Garment;
  why: string;
  matched: string[];
}

export interface Outfit {
  id: string;
  title: string;
  occasion: Occasion;
  concept: string;
  items: OutfitItem[];
  effect: string;
  score: number;
  /** 옷장 기반 조합이면 true */
  fromCloset: boolean;
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
