import { describe, expect, it } from "vitest";
import { computeSilhouette, DEFAULT_FITLAB, fitLabHrefForOutfit, fitLabParamsFromOutfit, parseFitLabQuery } from "../fitlab/silhouette";
import { GARMENTS } from "../styling/garments.data";

const item = (id: string) => ({ garment: GARMENTS.find((g) => g.id === id)!, why: "", matched: [] });

describe("fit lab silhouette", () => {
  it("슬림 < 레귤러 < 오버 순으로 폭이 넓어짐", () => {
    const w = (["slim", "regular", "over"] as const).map((f) => computeSilhouette(f, DEFAULT_FITLAB).maxWidth);
    expect(w[0]).toBeLessThan(w[1]);
    expect(w[1]).toBeLessThan(w[2]);
  });

  it("상의 길이가 짧을수록 시각 경계가 올라가 하체 비중이 커짐", () => {
    const crop = computeSilhouette("regular", { ...DEFAULT_FITLAB, topLength: "crop" });
    const long = computeSilhouette("regular", { ...DEFAULT_FITLAB, topLength: "long" });
    expect(crop.breakY).toBeLessThan(long.breakY);
    expect(crop.split.lower).toBeGreaterThan(long.split.lower);
    expect(crop.split.upper + crop.split.lower).toBe(100);
  });

  it("넣어 입기는 허리선 위치가 경계가 됨 (하이 < 제 허리 < 로우)", () => {
    const b = (["high", "natural", "low"] as const).map((w) => computeSilhouette("slim", { ...DEFAULT_FITLAB, waistLine: w }));
    expect(b.every((x) => x.tucked)).toBe(true);
    expect(b[0].breakY).toBeLessThan(b[1].breakY);
    expect(b[1].breakY).toBeLessThan(b[2].breakY);
  });

  it("바지 형태·아우터가 도해에 반영됨", () => {
    const skinny = computeSilhouette("regular", { ...DEFAULT_FITLAB, bottom: "skinny" });
    const wide = computeSilhouette("regular", { ...DEFAULT_FITLAB, bottom: "wide" });
    expect(skinny.bottom).not.toBe(wide.bottom);
    expect(computeSilhouette("regular", DEFAULT_FITLAB).outer).toBeNull();
    expect(computeSilhouette("regular", { ...DEFAULT_FITLAB, outer: "long" }).outer).toHaveLength(2);
    // 모든 조합에서 path가 유효한 숫자로 구성됨
    for (const bottom of ["skinny", "straight", "wide", "tapered", "skirt"] as const) {
      const s = computeSilhouette("over", { ...DEFAULT_FITLAB, bottom, outer: "short" });
      expect(s.bottom).not.toMatch(/NaN/);
      expect(s.top).not.toMatch(/NaN/);
    }
  });

  it("코디 → 실루엣 비교 조건 변환", () => {
    const { params, fit } = fitLabParamsFromOutfit({ items: [item("knit-crop"), item("pants-tapered"), item("jacket-short")] });
    expect(params).toEqual({ topLength: "crop", waistLine: "high", bottom: "tapered", outer: "short" });
    expect(fit).toBe("slim");
    expect(fitLabHrefForOutfit({ items: [item("tee-boxy"), item("chino-relaxed")] })).toContain("waist=untucked");
  });

  it("쿼리 파싱: 잘못된 값은 기본값", () => {
    const q = new URLSearchParams("top=crop&waist=xx&bottom=wide&focus=over");
    const r = parseFitLabQuery((k) => q.get(k));
    expect(r.params).toEqual({ ...DEFAULT_FITLAB, topLength: "crop", bottom: "wide" });
    expect(r.focus).toBe("over");
  });
});
