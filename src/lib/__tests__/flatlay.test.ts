import { describe, expect, it } from "vitest";
import { flatLayLayout, type Box } from "../styling/flatLayLayout";
import type { Slot } from "../styling/types";

const COMBOS: Slot[][] = [
  ["top", "bottom"],
  ["top", "bottom", "shoes"],
  ["top", "bottom", "shoes", "accessory"],
  ["top", "bottom", "outer", "shoes"],
  ["top", "bottom", "outer", "shoes", "accessory"],
  ["top", "bottom", "outer", "accessory"],
  ["dress", "shoes"],
  ["dress", "shoes", "accessory"],
  ["dress", "outer", "shoes", "accessory"],
];

const right = (b: Box) => b.l + b.w;
const bottom = (b: Box) => b.t + b.h;

describe("플랫레이 배치", () => {
  for (const shape of ["tall", "wide"] as const) {
    it.each(COMBOS.map((c) => [c.join("+")]))(`${shape}: %s 모든 아이템 배치·보드 안·가운데 정렬`, (key) => {
      const slots = key.split("+") as Slot[];
      const layout = flatLayLayout(slots, shape);
      expect(Object.keys(layout).sort()).toEqual([...slots].sort());
      const boxes = Object.values(layout) as Box[];
      for (const b of boxes) {
        expect(b.l).toBeGreaterThanOrEqual(-0.1);
        expect(b.t).toBeGreaterThanOrEqual(-0.1);
        expect(right(b)).toBeLessThanOrEqual(100.1);
        expect(bottom(b)).toBeLessThanOrEqual(100.1);
      }
      // 사용 영역의 가로·세로 중심이 보드 중앙(50%)
      const minL = Math.min(...boxes.map((b) => b.l));
      const maxR = Math.max(...boxes.map(right));
      const minT = Math.min(...boxes.map((b) => b.t));
      const maxB = Math.max(...boxes.map(bottom));
      expect((minL + maxR) / 2).toBeCloseTo(50, 0);
      expect((minT + maxB) / 2).toBeCloseTo(50, 0);
    });
  }

  it("아이템이 없으면 빈 배치", () => {
    expect(flatLayLayout([], "wide")).toEqual({});
  });
});
