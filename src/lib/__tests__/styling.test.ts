import { describe, expect, it } from "vitest";
import { GARMENTS } from "../styling/garments.data";
import { recommendFromCloset, recommendOutfits, stylePointsFor, typeWeights } from "../styling/recommend";
import type { Occasion, StyleLine, StylePreferences } from "../styling/types";
import type { BodyType } from "../classifier/types";

const basePrefs: StylePreferences = { line: "unisex", occasions: ["casual"], goals: [], focus: [], tastes: [] };
const lines: StyleLine[] = ["women", "men", "unisex"];
const occasions: Occasion[] = ["casual", "business", "date", "formal"];
const types: BodyType[] = ["straight", "wave", "natural"];

describe("garment data", () => {
  it("모든 아이템에 why/effect/alternative가 있다", () => {
    for (const g of GARMENTS) {
      expect(g.effect.length).toBeGreaterThan(0);
      expect(g.alternative.length).toBeGreaterThan(0);
      for (const t of types) expect(g.why[t].length).toBeGreaterThan(5);
      for (const t of types) expect(g.affinity[t]).toBeGreaterThanOrEqual(0);
    }
  });
  it("아이템 id가 고유하다", () => {
    expect(new Set(GARMENTS.map((g) => g.id)).size).toBe(GARMENTS.length);
  });
});

describe("recommendOutfits", () => {
  it.each(lines.flatMap((l) => occasions.flatMap((o) => types.map((t) => [l, o, t] as const))))(
    "%s / %s / %s 조합에서 최소 3개의 코디 생성",
    (line, occ, t) => {
      const outfits = recommendOutfits({
        result: { classification: t, primary: t, secondary: null },
        prefs: { ...basePrefs, line, occasions: [occ] },
      });
      expect(outfits.length).toBeGreaterThanOrEqual(3);
      for (const o of outfits) {
        const slots = o.items.map((i) => i.garment.slot);
        expect(slots.includes("dress") || (slots.includes("top") && slots.includes("bottom"))).toBe(true);
        if (line === "men") expect(slots).not.toContain("dress");
        for (const i of o.items) expect(i.garment.occasions).toContain(occ);
      }
      expect(new Set(outfits.map((o) => o.concept)).size).toBe(outfits.length);
    },
  );

  it("유형에 따라 상위 추천이 달라진다", () => {
    const top = (t: BodyType) =>
      recommendOutfits({ result: { classification: t, primary: t, secondary: null }, prefs: basePrefs })[0].items.map((i) => i.garment.id);
    expect(top("straight")).not.toEqual(top("natural"));
  });

  it("판정 보류여도 선호 조건으로 추천하고 이유를 명시", () => {
    const outfits = recommendOutfits({
      result: { classification: "inconclusive", primary: null, secondary: null },
      prefs: { ...basePrefs, goals: ["comfort"] },
    });
    expect(outfits.length).toBeGreaterThanOrEqual(3);
    expect(outfits[0].items[0].why).toContain("판정이 보류");
    expect(typeWeights(null)).toEqual({ straight: 0, wave: 0, natural: 0 });
  });

  it("여러 상황을 고르면 상황마다 코디 생성", () => {
    const outfits = recommendOutfits({
      result: { classification: "wave", primary: "wave", secondary: "straight" },
      prefs: { ...basePrefs, line: "women", occasions: ["business", "date"] },
    });
    expect(outfits.some((o) => o.occasion === "business")).toBe(true);
    expect(outfits.some((o) => o.occasion === "date")).toBe(true);
  });
});

describe("recommendFromCloset", () => {
  it("보유한 옷만 사용", () => {
    const closet = ["shirt", "tee", "jeans", "slacks", "sneaker", "jacket"];
    const r = recommendFromCloset({
      result: { classification: "straight", primary: "straight", secondary: null },
      prefs: basePrefs,
      closet,
    });
    expect(r.outfits.length).toBeGreaterThan(0);
    for (const o of r.outfits) for (const i of o.items) expect(closet).toContain(i.garment.closetKey);
    expect(r.missingSlots).toEqual([]);
    for (const s of r.suggestions) expect(closet).not.toContain(s.closetKey);
  });

  it("하의가 없으면 조합 대신 부족한 항목 안내", () => {
    const r = recommendFromCloset({ result: null, prefs: basePrefs, closet: ["shirt"] });
    expect(r.outfits).toEqual([]);
    expect(r.missingSlots).toContain("bottom");
  });
});

describe("stylePointsFor", () => {
  it("유형별 8개 포인트, 보류 시 일반 가이드", () => {
    expect(stylePointsFor({ classification: "natural", primary: "natural", secondary: null }).points).toHaveLength(8);
    expect(stylePointsFor({ classification: "inconclusive", primary: "wave", secondary: null }).type).toBeNull();
  });
});
