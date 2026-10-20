import type { ClassifierInput, QualitySummary, SelfAnswer } from "../classifier/types";
import type { PhotoAnalysis } from "./analyzePhoto";

/** 세션의 사진 분석 결과 + 자가 체크 → 분류 엔진 입력 */
export function buildClassifierInput(args: {
  front?: PhotoAnalysis;
  side?: PhotoAnalysis;
  answers: SelfAnswer[];
  fittedClothing: boolean;
}): ClassifierInput {
  const { front, side } = args;
  const frontOk = front?.status === "ok" && !!front.features;
  const sideOk = side?.status === "ok" && !!side.features;
  const notes = [...(frontOk ? front!.features!.notes : []), ...(sideOk ? side!.features!.notes : [])];
  const quality: QualitySummary = {
    frontAnalyzed: frontOk,
    frontLevel: frontOk ? front!.quality!.level : "none",
    sideAnalyzed: sideOk,
    sideLevel: sideOk ? side!.quality!.level : "none",
    fittedClothing: args.fittedClothing,
    notes: [...new Set(notes)],
  };
  return {
    visualFeatures: [...(frontOk ? front!.features!.features : []), ...(sideOk ? side!.features!.features : [])],
    selfAssessment: args.answers,
    quality,
  };
}
