import { describe, expect, it } from "vitest";
import { GARMENTS } from "../styling/garments.data";
import {
  normalizePrefs,
  outfitFromSnapshot,
  recommendFromCloset,
  recommendOutfits,
  resolveTypeContext,
  stylePointsFor,
  typeWeights,
} from "../styling/recommend";
import type { Occasion, StyleLine, StylePreferences } from "../styling/types";
import type { BodyType } from "../classifier/types";

const basePrefs: StylePreferences = { line: "unisex", occasions: ["casual"], goals: [], focus: [], tastes: [] };
const lines: StyleLine[] = ["women", "men", "unisex"];
const occasions: Occasion[] = ["casual", "business", "date", "formal", "travel"];
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
      prefs: { ...basePrefs, goals: ["balance"] },
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

describe("Phase 2: 추천 고도화", () => {
  const wave = { classification: "wave" as const, primary: "wave" as const, secondary: null };

  it("모든 의류에 새 분류 태그만 쓰임", () => {
    const occ = new Set(["casual", "business", "date", "formal", "travel"]);
    const goals = new Set(["balance", "long", "volume", "neat"]);
    const tastes = new Set(["minimal", "classic", "casual", "street", "formal"]);
    for (const g of GARMENTS) {
      g.occasions.forEach((o) => expect(occ.has(o)).toBe(true));
      g.goals.forEach((o) => expect(goals.has(o)).toBe(true));
      g.tastes.forEach((o) => expect(tastes.has(o)).toBe(true));
      if (["top", "bottom", "dress", "outer"].includes(g.slot)) expect(g.fitClass).toBeDefined();
    }
  });

  it("각 코디에 추천 이유와 핏 조절 방법이 있음", () => {
    const outfits = recommendOutfits({ result: wave, prefs: { ...basePrefs, goals: ["long"], tastes: ["classic"], occasions: ["date"] } });
    for (const o of outfits) {
      expect(o.reason).toContain("웨이브");
      expect(o.reason).toContain("데이트");
      expect(o.fitTips.length).toBeGreaterThanOrEqual(2);
      expect(o.fitTips.some((t) => t.startsWith("길어 보이는 비율"))).toBe(true);
      expect(o.coreKey.length).toBeGreaterThan(0);
    }
  });

  it("제외한 코디 조합은 다시 추천하지 않음", () => {
    const first = recommendOutfits({ result: wave, prefs: basePrefs });
    const excluded = first[0].coreKey;
    const next = recommendOutfits({ result: wave, prefs: basePrefs, feedback: { excludedCores: [excluded] } });
    expect(next.map((o) => o.coreKey)).not.toContain(excluded);
    expect(next.length).toBeGreaterThanOrEqual(3);
  });

  it("덜 추천 아이템은 순위가 내려감", () => {
    const first = recommendOutfits({ result: wave, prefs: basePrefs });
    const topItem = first[0].items[0].garment.id;
    const next = recommendOutfits({ result: wave, prefs: basePrefs, feedback: { dislikedGarments: [topItem] } });
    expect(next[0].items[0].garment.id).not.toBe(topItem);
  });

  it("선호 핏 기록이 반영됨", () => {
    const over = recommendOutfits({ result: null, prefs: basePrefs, feedback: { fitPreference: "over" } });
    const fits = over.flatMap((o) => o.items.map((i) => i.garment.fitClass)).filter(Boolean);
    expect(fits).toContain("over");
    expect(over[0].items.some((i) => i.matched.includes("선호 오버핏"))).toBe(true);
  });

  it("유형 기준: 자동은 세션 → 저장 결과 → 없음, 직접 선택·혼합형 지원", () => {
    expect(resolveTypeContext("auto", ["straight", "wave"], wave, null).source).toBe("session");
    expect(resolveTypeContext("auto", ["straight", "wave"], null, wave).source).toBe("saved");
    expect(resolveTypeContext("auto", ["straight", "wave"], null, null).result).toBeNull();
    expect(resolveTypeContext("natural", ["straight", "wave"], wave, null).result?.primary).toBe("natural");
    const mixed = resolveTypeContext("mixed", ["wave", "natural"], null, null).result!;
    expect(mixed).toMatchObject({ classification: "mixed", primary: "wave", secondary: "natural" });
  });

  it("예전 버전 선호값을 정리", () => {
    const p = normalizePrefs({ line: "men", occasions: [], goals: ["comfort" as never, "long"], tastes: ["soft" as never, "street"], focus: [] });
    expect(p.occasions).toEqual(["casual"]);
    expect(p.goals).toEqual(["long"]);
    expect(p.tastes).toEqual(["street"]);
  });

  it("저장된 코디를 다시 구성", () => {
    const o = recommendOutfits({ result: wave, prefs: basePrefs })[0];
    const back = outfitFromSnapshot({
      coreKey: o.coreKey,
      occasion: o.occasion,
      garmentIds: o.items.map((i) => i.garment.id),
      title: o.title,
      reason: o.reason,
      fitTips: o.fitTips,
      primary: "wave",
    });
    expect(back?.items.map((i) => i.garment.id)).toEqual(o.items.map((i) => i.garment.id));
    expect(outfitFromSnapshot({ coreKey: "x", occasion: "casual", garmentIds: ["nope"], title: "", reason: "", fitTips: [], primary: null })).toBeNull();
  });
});

describe("의복 이미지 목록", () => {
  it("모든 의류에 이미지가 있음", async () => {
    const { GARMENT_IMAGES } = await import("../styling/garmentImages.data");
    for (const g of GARMENTS) expect(GARMENT_IMAGES[g.id]).toBeDefined();
  });

  it("목록의 모든 이미지 파일이 존재하고, 아이템 id가 카탈로그에 있음", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { GARMENT_IMAGES } = await import("../styling/garmentImages.data");
    for (const [id, img] of Object.entries(GARMENT_IMAGES)) {
      expect(GARMENTS.some((g) => g.id === id)).toBe(true);
      expect(existsSync(join(process.cwd(), "public", img.file))).toBe(true);
      if (img.kind === "photo") expect(img.credit?.url).toMatch(/^https:\/\//);
    }
  });
});

describe("모델컷", () => {
  it("목록의 모든 모델컷 파일이 존재하고 키 형식이 올바름", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { MODEL_CUT_KEYS } = await import("../styling/modelCuts.data");
    expect(MODEL_CUT_KEYS.length).toBeGreaterThan(0);
    for (const k of MODEL_CUT_KEYS) {
      expect(k).toMatch(/^(women|men)__[a-z-]+(\+[a-z-]+)?$/);
      const ids = k.split("__")[1].split("+");
      for (const id of ids) expect(GARMENTS.some((g) => g.id === id)).toBe(true);
      expect(existsSync(join(process.cwd(), "public", "looks", `${k}.webp`))).toBe(true);
    }
  });

  it("여성복·남성복은 해당 성별 모델만, 없으면 모델컷 없이 표시", async () => {
    const { modelCutSrc, modelGenderFor } = await import("../styling/modelCuts");
    const { MODEL_CUT_KEYS } = await import("../styling/modelCuts.data");
    const women = recommendOutfits({ result: null, prefs: { ...basePrefs, line: "women" } });
    for (const [i, o] of women.entries()) {
      const m = modelCutSrc(o, "women", i);
      if (m) expect(m.gender).toBe("women");
      expect(MODEL_CUT_KEYS.includes(`women__${o.coreKey}`)).toBe(!!m);
    }
    const fake = { coreKey: "no-such+combo", items: women[0].items };
    expect(modelCutSrc(fake, "men", 0)).toBeNull();
    // 여성 전용 아이템(스커트)이 있으면 유니섹스에서도 여성 모델
    const skirt = GARMENTS.find((g) => g.id === "skirt-flare")!;
    expect(modelGenderFor({ items: [{ garment: skirt, why: "", matched: [] }] }, "unisex", 1)).toBe("women");
  });
});
