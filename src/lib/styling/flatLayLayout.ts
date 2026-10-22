import type { Slot } from "./types";

/**
 * 누끼 플랫레이 배치 계산 (순수 함수).
 * - 보드 모양(tall: 모델컷 옆의 세로형 / wide: 모델컷이 없을 때 가로형)과
 *   아이템 구성(아우터 유무, 원피스 여부, 신발·소품 유무)에 따라 배치를 고르고
 * - 마지막에 사용된 영역 전체를 보드 가운데로 옮겨 한쪽으로 쏠리지 않게 합니다.
 * 좌표는 보드 대비 % (l, t, w, h), z는 겹침 순서.
 */
export interface Box {
  l: number;
  t: number;
  w: number;
  h: number;
  z: number;
}
export type BoardShape = "tall" | "wide";

const b = (l: number, t: number, w: number, h: number, z: number): Box => ({ l, t, w, h, z });

function mainBoxes(shape: BoardShape, hasDress: boolean, hasOuter: boolean): Partial<Record<Slot, Box>> {
  if (shape === "tall") {
    if (hasDress) return hasOuter ? { outer: b(2, 2, 54, 46, 1), dress: b(34, 4, 64, 74, 3) } : { dress: b(12, 2, 76, 76, 3) };
    return hasOuter
      ? { outer: b(2, 2, 56, 42, 1), top: b(42, 6, 56, 34, 3), bottom: b(20, 36, 60, 42, 2) }
      : { top: b(12, 2, 76, 38, 3), bottom: b(20, 36, 60, 42, 2) };
  }
  if (hasDress) return hasOuter ? { dress: b(4, 3, 40, 94, 3), outer: b(40, 4, 38, 56, 1) } : { dress: b(10, 3, 44, 94, 3) };
  return hasOuter
    ? { outer: b(2, 4, 34, 54, 1), top: b(26, 8, 34, 46, 3), bottom: b(56, 3, 26, 94, 2) }
    : { top: b(6, 6, 42, 54, 3), bottom: b(46, 3, 28, 94, 2) };
}

/** 신발·소품: 남는 공간에 배치 (하나뿐이면 가운데) */
function smallBoxes(shape: BoardShape, hasDress: boolean, hasOuter: boolean, shoes: boolean, acc: boolean): Partial<Record<Slot, Box>> {
  if (!shoes && !acc) return {};
  if (shape === "tall") {
    if (shoes && acc) return { shoes: b(4, 80, 44, 18, 4), accessory: b(52, 80, 44, 18, 4) };
    return shoes ? { shoes: b(28, 80, 44, 18, 4) } : { accessory: b(28, 80, 44, 18, 4) };
  }
  // 가로형: 오른쪽(또는 아우터가 있으면 아래쪽 빈 곳) 세로 열
  if (hasOuter) {
    // 아우터·상의 아래 빈 공간에 신발·소품을 나란히
    const col = hasDress ? 46 : 6;
    if (shoes && acc) return { shoes: b(col, 62, 26, 32, 4), accessory: b(col + 28, 64, 22, 30, 4) };
    return shoes ? { shoes: b(col, 62, 30, 32, 4) } : { accessory: b(col, 62, 30, 32, 4) };
  }
  const x = hasDress ? 58 : 76;
  const w = hasDress ? 36 : 22;
  if (shoes && acc) return { accessory: b(x, 10, w, 34, 4), shoes: b(x, 56, w, 34, 4) };
  return shoes ? { shoes: b(x, 33, w, 34, 4) } : { accessory: b(x, 33, w, 34, 4) };
}

export function flatLayLayout(slots: Slot[], shape: BoardShape): Partial<Record<Slot, Box>> {
  const has = (s: Slot) => slots.includes(s);
  const hasDress = has("dress");
  const hasOuter = has("outer");
  const boxes: Partial<Record<Slot, Box>> = {
    ...mainBoxes(shape, hasDress, hasOuter),
    ...smallBoxes(shape, hasDress, hasOuter, has("shoes"), has("accessory")),
  };
  // 실제로 쓰는 슬롯만 남기고, 전체 영역을 가운데로
  const used = (Object.keys(boxes) as Slot[]).filter((s) => has(s));
  if (!used.length) return {};
  const minL = Math.min(...used.map((s) => boxes[s]!.l));
  const maxR = Math.max(...used.map((s) => boxes[s]!.l + boxes[s]!.w));
  const minT = Math.min(...used.map((s) => boxes[s]!.t));
  const maxB = Math.max(...used.map((s) => boxes[s]!.t + boxes[s]!.h));
  const dx = 50 - (minL + maxR) / 2;
  const dy = 50 - (minT + maxB) / 2;
  const out: Partial<Record<Slot, Box>> = {};
  for (const s of used) {
    const x = boxes[s]!;
    out[s] = { ...x, l: Math.round((x.l + dx) * 10) / 10, t: Math.round((x.t + dy) * 10) / 10 };
  }
  return out;
}
