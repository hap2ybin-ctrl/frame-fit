import { describe, expect, it } from "vitest";
import type { VisualFeature } from "../analysis/features";
import { classify, describeMixed, josa } from "../classifier/engine";
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

describe("혼합형에서 더 가까운 쪽 표시", () => {
  it("점수가 높은 쪽을 더 가까운 유형으로 표시", () => {
    const l = describeMixed({ straight: 6.5, wave: 6.0, natural: 1 }, "straight", "wave");
    expect(l.closer).toBe("straight");
    expect(l.text).toContain("스트레이트 쪽에 조금 더 가까워요");
    expect(l.text).toContain("6.5 vs 6.0");
  });

  it("순서와 관계없이 점수로 판단", () => {
    expect(describeMixed({ straight: 4, wave: 7, natural: 0 }, "straight", "wave").closer).toBe("wave");
  });

  it("동점이면 어느 쪽도 더 가깝다고 하지 않음", () => {
    const l = describeMixed({ straight: 0, wave: 5, natural: 5 }, "wave", "natural");
    expect(l.closer).toBeNull();
    expect(l.text).toContain("웨이브와 내추럴의 근거가 같아요");
  });

  it("엔진의 혼합형 결과 이유에 더 가까운 쪽이 포함됨", () => {
    const a = answersFor("straight", 4);
    const b = answersFor("wave").slice(4);
    const r = classify({ visualFeatures: [], selfAssessment: [...a, ...b], quality: noPhoto });
    expect(r.classification).toBe("mixed");
    expect(r.reasons.some((x) => x.includes("더 가까워요") || x.includes("근거가 같아요"))).toBe(true);
  });

  it("동점인 혼합형은 동점으로 안내", () => {
    // 스트레이트 2점 문항 2개 vs 웨이브 2점 문항 2개 → 4 vs 4
    const pick = (qid: string, t: BodyType) => ({ questionId: qid, optionId: QUESTIONS.find((q) => q.id === qid)!.options.find((o) => (o.points[t] ?? 0) > 0)!.id });
    const r = classify({
      visualFeatures: [],
      selfAssessment: [pick("torso-depth", "straight"), pick("collarbone", "straight"), pick("tissue", "wave"), pick("center", "wave")],
      quality: noPhoto,
    });
    expect(r.classification).toBe("mixed");
    expect(r.scores.straight).toBe(r.scores.wave);
    expect(r.reasons.join(" ")).toContain("근거가 같아요");
  });

  it("조사 처리", () => {
    expect(josa("내추럴", "과", "와")).toBe("내추럴과");
    expect(josa("웨이브", "과", "와")).toBe("웨이브와");
    expect(josa("스트레이트", "이에요", "예요")).toBe("스트레이트예요");
  });
});
