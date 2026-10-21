import { MODEL_CUT_KEYS } from "./modelCuts.data";
import type { Garment, Outfit, StyleLine } from "./types";

/**
 * 코디 모델컷 — AI로 생성한 모델이 상의+하의(또는 원피스) 조합을 입은 이미지.
 * public/looks/<gender>__<coreKey>.webp
 * 아우터·신발·소품은 조건마다 달라지므로 모델컷에는 핵심 조합만 반영되어 있습니다.
 */
export type ModelGender = "women" | "men";

const AVAILABLE = new Set(MODEL_CUT_KEYS);

/** 여성 라인에만 있는 아이템이 있으면 여성 모델, 남성 라인 전용이 있으면 남성 모델 */
function genderFromGarments(garments: Garment[]): ModelGender | null {
  if (garments.some((g) => g.lines.includes("women") && !g.lines.includes("men"))) return "women";
  if (garments.some((g) => g.lines.includes("men") && !g.lines.includes("women"))) return "men";
  return null;
}

/**
 * 보여 줄 모델 성별: 의류 스타일이 여성복/남성복이면 그대로,
 * 유니섹스(또는 알 수 없음)면 아이템 구성으로 정하고, 그래도 정해지지 않으면 카드 순서에 따라 번갈아 보여 줌.
 */
export function modelGenderFor(outfit: Pick<Outfit, "items">, line: StyleLine | null, index: number): ModelGender {
  if (line === "women" || line === "men") return line;
  return genderFromGarments(outfit.items.map((i) => i.garment)) ?? (index % 2 === 0 ? "women" : "men");
}

export function modelCutSrc(outfit: Pick<Outfit, "items" | "coreKey">, line: StyleLine | null, index: number): { src: string; gender: ModelGender } | null {
  const preferred = modelGenderFor(outfit, line, index);
  for (const gender of [preferred, preferred === "women" ? "men" : "women"] as ModelGender[]) {
    // 선택한 라인이 정해진 경우에는 다른 성별 모델로 대체하지 않음
    if (gender !== preferred && (line === "women" || line === "men")) break;
    const key = `${gender}__${outfit.coreKey}`;
    if (AVAILABLE.has(key)) return { src: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/looks/${key}.webp`, gender };
  }
  return null;
}
