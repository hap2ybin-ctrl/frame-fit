import { describe, expect, it } from "vitest";
import type { VisualFeature } from "../analysis/features";
import { classify } from "../classifier/engine";
import { QUESTIONS, UNKNOWN_OPTION_ID } from "../classifier/questions.config";
import type { BodyType, QualitySummary, SelfAnswer } from "../classifier/types";

const goodQuality: QualitySummary = {
  frontAnalyzed: true,
  frontLevel: "good",
  sideAnalyzed: false,
  sideLevel: "none",
  fittedClothing: false,
  notes: [],
};
const noPhoto: QualitySummary = { ...goodQuality, frontAnalyzed: false, frontLevel: "none" };

/** 각 문항에서 해당 유형에 점수를 주는 옵션 선택 */
function answersFor(type: BodyType, count = QUESTIONS.length): SelfAnswer[] {
  return QUESTIONS.slice(0, count).map((q) => ({
    questionId: q.id,
    optionId: q.options.find((o) => (o.points[type] ?? 0) > 0)!.id,
  }));
}

function feature(id: VisualFeature["id"], value: number, view: VisualFeature["view"] = "front"): VisualFeature {
  return { id, value, label: id, source: "landmark", view, clothingSensitive: false, description: "" };
}

describe("classify", () => {
  it("응답이 부족하면 판정 보류 (사진만으로 판정하지 않음)", () => {
    const r = classify({
      visualFeatures: [feature("shoulderHipRatio", 1.8), feature("shoulderTorsoRatio", 0.9)],
      selfAssessment: answersFor("natural", 2),
      quality: goodQuality,
    });
    expect(r.classification).toBe("inconclusive");
    expect(r.reasons[0]).toContain("최소");
  });

  it("'잘 모르겠어요'는 응답 수에서 제외", () => {
    const r = classify({
      visualFeatures: [],
      selfAssessment: QUESTIONS.map((q) => ({ questionId: q.id, optionId: UNKNOWN_OPTION_ID })),
      quality: noPhoto,
    });
    expect(r.answeredCount).toBe(0);
    expect(r.classification).toBe("inconclusive");
    expect(r.primary).toBeNull();
  });

  it.each<BodyType>(["straight", "wave", "natural"])("일관된 자가 체크는 %s로 판정", (t) => {
    const r = classify({ visualFeatures: [], selfAssessment: answersFor(t), quality: noPhoto });
    expect(r.classification).toBe(t);
    expect(r.primary).toBe(t);
    expect(r.limitations.join(" ")).toContain("참고용");
  });

  it("두 유형이 비슷하면 혼합형", () => {
    const a = answersFor("straight", 4);
    const b = answersFor("wave").slice(4);
    const r = classify({ visualFeatures: [], selfAssessment: [...a, ...b], quality: noPhoto });
    expect(r.classification).toBe("mixed");
    expect([r.primary, r.secondary].sort()).toEqual(["straight", "wave"]);
  });

  it("촬영 품질이 낮으면 사진 근거를 0으로", () => {
    const r = classify({
      visualFeatures: [feature("shoulderHipRatio", 1.2), feature("torsoLegRatio", 0.7)],
      selfAssessment: answersFor("straight"),
      quality: { ...goodQuality, frontLevel: "poor" },
    });
    expect(r.visualScores.wave).toBe(0);
    expect(r.evidence.filter((e) => e.source === "visual").every((e) => e.caution?.includes("품질"))).toBe(true);
  });

  it("사진 근거는 판정에 반영되고 근거 문장을 남긴다", () => {
    const r = classify({
      visualFeatures: [feature("shoulderHipRatio", 1.2), feature("torsoLegRatio", 0.7)],
      selfAssessment: answersFor("wave"),
      quality: goodQuality,
    });
    expect(r.visualScores.wave).toBeGreaterThan(0);
    expect(r.classification).toBe("wave");
    expect(r.evidence.some((e) => e.detail.includes("1.20"))).toBe(true);
  });

  it("사진과 자가 체크가 충돌하고 차이가 작으면 혼합형", () => {
    // 자가 체크: straight 우세(4문항) + wave 2문항, 사진: wave 쪽
    const self = [...answersFor("straight", 4), ...answersFor("wave").slice(4, 6)];
    const r = classify({
      visualFeatures: [feature("shoulderHipRatio", 1.1), feature("torsoLegRatio", 0.75), feature("shoulderTorsoRatio", 0.5)],
      selfAssessment: self,
      quality: goodQuality,
    });
    expect(r.evidence.some((e) => e.source === "system" && e.topic === "근거 간 차이")).toBe(true);
    expect(r.classification).toBe("mixed");
  });

  it("측면 윤곽 규칙은 몸에 붙는 옷 표시 시에만 반영", () => {
    const side = { ...feature("sideUpperDepthRatio", 0.6, "side"), source: "silhouette" as const };
    const base = { selfAssessment: answersFor("straight"), visualFeatures: [side] };
    const off = classify({ ...base, quality: { ...goodQuality, sideAnalyzed: true, sideLevel: "good" } });
    const on = classify({ ...base, quality: { ...goodQuality, sideAnalyzed: true, sideLevel: "good", fittedClothing: true } });
    expect(off.visualScores.straight).toBe(0);
    expect(on.visualScores.straight).toBeGreaterThan(0);
  });

  it("점수는 퍼센트가 아니며 결과는 결정적", () => {
    const input = { visualFeatures: [feature("torsoLegRatio", 0.6)], selfAssessment: answersFor("natural"), quality: goodQuality };
    expect(classify(input)).toEqual(classify(input));
    const r = classify(input);
    expect(r.strength).toMatch(/strong|moderate|weak/);
    expect(r.rulesVersion).toContain("unvalidated");
  });
});
