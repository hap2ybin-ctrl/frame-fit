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

describe("완성 룩 큐레이션", () => {
  const ctxs = [
    null,
    ...(["straight", "wave", "natural"] as const).map((t) => ({ classification: t, primary: t, secondary: null })),
    { classification: "mixed" as const, primary: "wave" as const, secondary: "natural" as const },
  ];

  it("룩 데이터: 아이템·성별 라인·상황이 일관되고 모델컷 파일이 있음", async () => {
    const { existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { CURATED_LOOKS } = await import("../styling/looks.data");
    expect(CURATED_LOOKS.length).toBe(320);
    for (const l of CURATED_LOOKS) {
      for (const id of l.garmentIds) {
        const g = GARMENTS.find((x) => x.id === id)!;
        expect(g).toBeDefined();
        expect(g.lines).toContain(l.gender);
        expect(g.occasions).toContain(l.occasion);
      }
      expect(existsSync(join(process.cwd(), "public", "looks", `${l.image}.webp`))).toBe(true);
    }
  });

  it.each(lines.flatMap((l) => occasions.map((o) => [l, o] as const)))("%s / %s: 모든 유형 기준에서 3개 이상, 모델컷 포함", async (line, occ) => {
    const { recommendLooks, lookBodyType } = await import("../styling/recommend");
    for (const r of ctxs) {
      const outs = recommendLooks({ result: r, prefs: { ...basePrefs, line, occasions: [occ] } });
      expect(outs.length).toBeGreaterThanOrEqual(3);
      for (const o of outs) {
        expect(o.look).toBeDefined();
        if (line !== "unisex") expect(o.look!.gender).toBe(line);
        expect(o.reason.length).toBeGreaterThan(10);
        expect(o.fitTips.length).toBeGreaterThan(0);
      }
      // 첫 번째 룩은 추천 기준과 같은 체형 모델
      expect(outs[0].look!.bodyType).toBe(lookBodyType(r));
      expect(new Set(outs.map((o) => o.coreKey)).size).toBe(outs.length);
    }
  });

  it("혼합형은 1순위 유형 모델, 판정 보류는 유형 없음 모델", async () => {
    const { lookBodyType } = await import("../styling/recommend");
    expect(lookBodyType({ classification: "mixed", primary: "wave", secondary: "natural" })).toBe("wave");
    expect(lookBodyType({ classification: "inconclusive", primary: "straight", secondary: null })).toBe("neutral");
    expect(lookBodyType(null)).toBe("neutral");
  });

  it("다양성: 같은 칸(성별·체형·상황) 안에서 상의·하의·원피스는 최대 2번, 메인 아이템은 성별 룩의 15% 이하", async () => {
    const { CURATED_LOOKS } = await import("../styling/looks.data");
    const cells = new Map<string, Map<string, number>>();
    const perGender = new Map<string, Map<string, number>>();
    for (const l of CURATED_LOOKS) {
      const cell = cells.get(`${l.gender}/${l.bodyType}/${l.occasion}`) ?? new Map();
      const total = perGender.get(l.gender) ?? new Map();
      for (const id of l.garmentIds) {
        const slot = GARMENTS.find((g) => g.id === id)!.slot;
        if (slot === "top" || slot === "bottom" || slot === "dress") {
          cell.set(id, (cell.get(id) ?? 0) + 1);
          total.set(id, (total.get(id) ?? 0) + 1);
        }
      }
      cells.set(`${l.gender}/${l.bodyType}/${l.occasion}`, cell);
      perGender.set(l.gender, total);
    }
    expect(cells.size).toBe(40);
    for (const cell of cells.values()) expect(Math.max(...cell.values())).toBeLessThanOrEqual(2);
    for (const total of perGender.values()) expect(Math.max(...total.values())).toBeLessThanOrEqual(160 * 0.15);
    // 카탈로그의 모든 아이템이 한 번 이상 쓰임
    const used = new Set(CURATED_LOOKS.flatMap((l) => l.garmentIds));
    for (const g of GARMENTS) expect(used.has(g.id)).toBe(true);
  });

  it("다른 코디 보기: 회차마다 다른 룩을 보여 주고 끝나면 처음으로 돌아감", async () => {
    const { recommendLooks, lookRoundCount } = await import("../styling/recommend");
    const r = { classification: "straight" as const, primary: "straight" as const, secondary: null };
    const input = { result: r, prefs: { ...basePrefs, line: "men" as const, occasions: ["casual" as const] } };
    const rounds = lookRoundCount(input);
    expect(rounds).toBeGreaterThanOrEqual(3);
    const seen = new Set<string>();
    for (let round = 0; round < 3; round++) {
      const outs = recommendLooks({ ...input, round });
      expect(outs.length).toBe(3);
      for (const o of outs) seen.add(o.look!.id);
    }
    expect(seen.size).toBe(9);
    expect(recommendLooks({ ...input, round: rounds }).map((o) => o.id)).toEqual(recommendLooks(input).map((o) => o.id));
  });

  it("제외한 코디는 다시 나오지 않음", async () => {
    const { recommendLooks } = await import("../styling/recommend");
    const r = { classification: "wave" as const, primary: "wave" as const, secondary: null };
    const first = recommendLooks({ result: r, prefs: { ...basePrefs, line: "women" } });
    const next = recommendLooks({ result: r, prefs: { ...basePrefs, line: "women" }, feedback: { excludedCores: [first[0].coreKey] } });
    expect(next.map((o) => o.coreKey)).not.toContain(first[0].coreKey);
    expect(next.length).toBeGreaterThanOrEqual(3);
  });
});
