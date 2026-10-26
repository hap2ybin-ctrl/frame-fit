import { describe, expect, it } from "vitest";
import { GARMENTS } from "../styling/garments.data";
import { colorMatch, outfitColorNote, PERSONAL_COLOR, PERSONAL_COLOR_ORDER } from "../styling/personalColor";
import { normalizePrefs, recommendLooks, scoreGarment } from "../styling/recommend";
import { BODY_BRIEF, NEUTRAL_BRIEF } from "../styling/bodyBrief.data";

const g = (id: string) => GARMENTS.find((x) => x.id === id)!;
const weights = { straight: 1, wave: 0, natural: 0 };

describe("퍼스널 컬러", () => {
  it("대표 컬러 판정: 카멜은 가을 웜에 맞고 겨울 쿨엔 주의, 블랙은 겨울 쿨에 맞고 봄 웜엔 주의", () => {
    expect(colorMatch(g("coat-long").color, "autumn").fit).toBe("good");
    expect(colorMatch(g("coat-long").color, "winter").fit).toBe("caution");
    expect(colorMatch(g("turtleneck").color, "winter").fit).toBe("good");
    expect(colorMatch(g("turtleneck").color, "spring").fit).toBe("caution");
    expect(colorMatch("#FFFFFF", "autumn").fit).toBe("caution");
    expect(colorMatch("#FFFFFF", "winter").fit).toBe("good");
  });

  it("팔레트 데이터가 완전함", () => {
    for (const s of PERSONAL_COLOR_ORDER) {
      const p = PERSONAL_COLOR[s];
      expect(p.best.length).toBeGreaterThanOrEqual(5);
      expect(p.neutrals.length).toBeGreaterThanOrEqual(5);
      expect(p.caution.length).toBeGreaterThanOrEqual(3);
      expect(p.accessories.map((a) => a.label)).toContain("메탈");
      for (const sw of [...p.best, ...p.neutrals, ...p.caution]) expect(sw.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("선택값 정리: 모르면 null, 잘못된 값도 null", () => {
    expect(normalizePrefs({}).personalColor).toBeNull();
    expect(normalizePrefs({ personalColor: "autumn" }).personalColor).toBe("autumn");
    expect(normalizePrefs({ personalColor: "rainbow" as never }).personalColor).toBeNull();
  });

  it("점수: 맞는 컬러는 가산, 주의 컬러는 감점 (얼굴에 가까울수록 크게)", () => {
    const base = normalizePrefs({});
    const autumn = normalizePrefs({ personalColor: "autumn" });
    const winter = normalizePrefs({ personalColor: "winter" });
    const coat = g("coat-long");
    expect(scoreGarment(coat, weights, autumn).score).toBeGreaterThan(scoreGarment(coat, weights, base).score);
    expect(scoreGarment(coat, weights, winter).score).toBeLessThan(scoreGarment(coat, weights, base).score);
    expect(scoreGarment(coat, weights, autumn).matched).toContain("가을 웜 컬러");
  });

  it("추천 룩에 반영: 가을 웜이면 얼굴 가까운 아이템의 주의 컬러가 줄어듦", () => {
    const r = { classification: "straight" as const, primary: "straight" as const, secondary: null };
    const cautionNearFace = (pc: "autumn" | null) =>
      recommendLooks({ result: r, prefs: normalizePrefs({ line: "women", occasions: ["casual", "business", "date"], personalColor: pc }) }, 9)
        .flatMap((o) => o.items.map((i) => i.garment))
        .filter((x) => ["top", "dress", "outer"].includes(x.slot) && colorMatch(x.color, "autumn").fit === "caution").length;
    expect(cautionNearFace("autumn")).toBeLessThanOrEqual(cautionNearFace(null));
  });

  it("코디 컬러 메모: 잘 맞는 아이템, 주의 아이템 팁, 액세서리 메탈", () => {
    const note = outfitColorNote(
      [g("shirt-oxford"), g("slacks-beige"), g("coat-long")].map((x) => ({ name: x.name, color: x.color, slot: x.slot })),
      "autumn",
    );
    expect(note.good).toContain(g("coat-long").name);
    expect(note.caution.map((c) => c.name)).toContain(g("shirt-oxford").name);
    expect(note.accessory).toContain("골드");
  });
});

describe("체형 브리핑", () => {
  it("유형별 강조·보완 포인트가 있음", () => {
    for (const b of [...Object.values(BODY_BRIEF), NEUTRAL_BRIEF]) {
      expect(b.summary.length).toBeGreaterThan(10);
      expect(b.emphasize.length).toBeGreaterThanOrEqual(2);
      expect(b.balance.length).toBeGreaterThanOrEqual(2);
    }
  });
});
