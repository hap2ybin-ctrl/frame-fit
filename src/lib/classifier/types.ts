import type { FeatureId, VisualFeature } from "../analysis/features";

export type BodyType = "straight" | "wave" | "natural";
export type Classification = BodyType | "mixed" | "inconclusive";
export type TypeScores = Record<BodyType, number>;

export const BODY_TYPES: readonly BodyType[] = ["straight", "wave", "natural"] as const;

export interface SelfAnswer {
  questionId: string;
  /** 선택한 옵션 id. "unknown"은 잘 모르겠음 */
  optionId: string;
}

export interface QualitySummary {
  /** 정면 사진 분석 여부 */
  frontAnalyzed: boolean;
  frontLevel: "good" | "fair" | "poor" | "none";
  sideAnalyzed: boolean;
  sideLevel: "good" | "fair" | "poor" | "none";
  /** 사용자가 몸에 붙는 옷을 입고 촬영했다고 표시했는지 */
  fittedClothing: boolean;
  notes: string[];
}

export interface ClassifierInput {
  visualFeatures: VisualFeature[];
  selfAssessment: SelfAnswer[];
  quality: QualitySummary;
}

export interface Evidence {
  source: "visual" | "self" | "system";
  /** 근거 대상 (특징 이름 또는 질문 주제) */
  topic: string;
  detail: string;
  /** 이 근거가 더한 점수 */
  contributions: Partial<TypeScores>;
  featureId?: FeatureId;
  questionId?: string;
  /** 옷·자세 영향을 크게 받는 근거 */
  caution?: string;
}

export type EvidenceStrength = "strong" | "moderate" | "weak";

export interface ClassificationResult {
  classification: Classification;
  /** 가장 가까운 유형 (inconclusive여도 참고용으로 제공될 수 있음) */
  primary: BodyType | null;
  secondary: BodyType | null;
  /** 규칙 기반 누적 점수 — 확률이나 정확도가 아님 */
  scores: TypeScores;
  visualScores: TypeScores;
  selfScores: TypeScores;
  evidence: Evidence[];
  strength: EvidenceStrength;
  reasons: string[];
  limitations: string[];
  answeredCount: number;
  totalQuestions: number;
  rulesVersion: string;
}
