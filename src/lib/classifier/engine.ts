import { QUESTIONS, UNKNOWN_OPTION_ID, type Question } from "./questions.config";
import { DECISION, RULES_VERSION, VISUAL_RULES, type DecisionConfig, type VisualRule } from "./rules.config";
import {
  BODY_TYPES,
  type BodyType,
  type ClassificationResult,
  type ClassifierInput,
  type Evidence,
  type EvidenceStrength,
  type TypeScores,
} from "./types";

export const TYPE_LABEL: Record<BodyType, string> = {
  straight: "스트레이트",
  wave: "웨이브",
  natural: "내추럴",
};

const zero = (): TypeScores => ({ straight: 0, wave: 0, natural: 0 });

function addScores(target: TypeScores, add: Partial<TypeScores>, k = 1) {
  for (const t of BODY_TYPES) target[t] += (add[t] ?? 0) * k;
}

function scaled(add: Partial<TypeScores>, k: number): Partial<TypeScores> {
  const out: Partial<TypeScores> = {};
  for (const t of BODY_TYPES) if (add[t]) out[t] = round2(add[t]! * k);
  return out;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function ranked(scores: TypeScores): BodyType[] {
  // 동점일 때 결과가 흔들리지 않도록 고정된 순서로 정렬
  return [...BODY_TYPES].sort((a, b) => scores[b] - scores[a]);
}

export interface ClassifierConfig {
  rules?: VisualRule[];
  questions?: Question[];
  decision?: DecisionConfig;
}

/**
 * 투명한 규칙 기반 판정.
 * 1) 사진 특징 → 규칙 매칭 점수 (품질 배수 적용)
 * 2) 자가 체크 → 문항 점수
 * 3) 응답 부족·낮은 1위 점수 → 판정 보류, 근소한 차이·근거 충돌 → 혼합형
 */
export function classify(input: ClassifierInput, config: ClassifierConfig = {}): ClassificationResult {
  const rules = config.rules ?? VISUAL_RULES;
  const questions = config.questions ?? QUESTIONS;
  const d = config.decision ?? DECISION;

  const evidence: Evidence[] = [];
  const reasons: string[] = [];
  const limitations: string[] = [];

  // ── 1. 사진 기반 근거 ─────────────────────────────────────────
  const visualScores = zero();
  const qMult = d.qualityMultiplier[input.quality.frontLevel] * d.visualWeight;
  const sideMult = d.qualityMultiplier[input.quality.sideLevel] * d.visualWeight;

  for (const f of input.visualFeatures) {
    const rule = rules.find((r) => r.feature === f.id);
    if (!rule) continue;
    const mult = f.view === "side" ? sideMult : qMult;
    const band = f.value < rule.low ? "low" : f.value > rule.high ? "high" : "neutral";
    const text = band === "low" ? rule.lowText : band === "high" ? rule.highText : rule.neutralText;
    const base = band === "low" ? rule.whenLow : band === "high" ? rule.whenHigh : {};
    const excluded = rule.requiresFittedClothing && !input.quality.fittedClothing;
    const k = excluded ? 0 : rule.weight * mult;
    const contributions = scaled(base, k);
    addScores(visualScores, contributions);

    let caution = rule.caution;
    if (excluded) caution = `${rule.caution ?? ""} 이번에는 점수에 반영하지 않았어요.`.trim();
    else if (mult === 0) caution = "촬영 품질이 낮아 점수에 반영하지 않았어요.";
    else if (mult < 1) caution = `${caution ? caution + " " : ""}촬영 품질을 고려해 낮은 비중으로 반영했어요.`;

    evidence.push({
      source: "visual",
      topic: f.label,
      detail: `${text} (측정 비율 ${f.value.toFixed(2)})`,
      contributions,
      featureId: f.id,
      caution,
    });
  }

  if (!input.quality.frontAnalyzed) {
    limitations.push("정면 사진 분석이 없어 자가 체크만으로 경향을 정리했어요.");
  } else if (input.quality.frontLevel === "poor") {
    limitations.push("정면 촬영 품질이 낮아 사진 기반 근거를 점수에서 제외했어요.");
  } else if (input.quality.frontLevel === "fair") {
    limitations.push("정면 촬영 품질이 보통이라 사진 기반 근거를 낮은 비중으로 반영했어요.");
  }
  if (!input.quality.sideAnalyzed) {
    limitations.push("측면 사진이 없어 상체 앞뒤 두께는 자가 체크에만 의존했어요.");
  }
  limitations.push(...input.quality.notes);

  // ── 2. 자가 체크 근거 ─────────────────────────────────────────
  const selfScores = zero();
  let answered = 0;
  for (const q of questions) {
    const a = input.selfAssessment.find((s) => s.questionId === q.id);
    if (!a || a.optionId === UNKNOWN_OPTION_ID) continue;
    const opt = q.options.find((o) => o.id === a.optionId);
    if (!opt) continue;
    answered++;
    const contributions = scaled(opt.points, d.selfWeight);
    addScores(selfScores, contributions);
    evidence.push({
      source: "self",
      topic: q.topic,
      detail: `직접 체크: "${opt.label}"`,
      contributions,
      questionId: q.id,
    });
  }

  const scores = zero();
  addScores(scores, visualScores);
  addScores(scores, selfScores);
  for (const t of BODY_TYPES) scores[t] = round2(scores[t]);

  const order = ranked(scores);
  const [top, second] = order;
  const topScore = scores[top];
  const margin = topScore > 0 ? (topScore - scores[second]) / topScore : 0;

  const visualOrder = ranked(visualScores);
  const selfOrder = ranked(selfScores);
  const visualLeaderStrong =
    visualScores[visualOrder[0]] >= d.conflictVisualMin && visualScores[visualOrder[0]] > visualScores[visualOrder[1]];
  const conflict = visualLeaderStrong && answered > 0 && visualOrder[0] !== selfOrder[0] && selfScores[selfOrder[0]] > selfScores[selfOrder[1]];

  if (conflict) {
    evidence.push({
      source: "system",
      topic: "근거 간 차이",
      detail: `사진 기반 근거는 ${TYPE_LABEL[visualOrder[0]]} 쪽, 자가 체크는 ${TYPE_LABEL[selfOrder[0]]} 쪽에 더 가까웠어요.`,
      contributions: {},
    });
  }

  // ── 3. 판정 ──────────────────────────────────────────────────
  let classification: ClassificationResult["classification"];
  let primary: BodyType | null = top;
  let secondary: BodyType | null = second;

  if (answered < d.minSelfAnswers) {
    classification = "inconclusive";
    reasons.push(
      `자가 체크 응답이 ${answered}개로, 판정에 필요한 최소 ${d.minSelfAnswers}개보다 적어요. 사진만으로는 골격 유형을 판단하지 않아요.`,
    );
    if (topScore <= 0) {
      primary = null;
      secondary = null;
    }
  } else if (topScore < d.minTopScore) {
    classification = "inconclusive";
    reasons.push("유형별 근거가 전반적으로 약해 한 방향으로 정리하기 어려워요.");
  } else if (margin < d.mixedMarginRatio) {
    classification = "mixed";
    reasons.push(`${TYPE_LABEL[top]}와(과) ${TYPE_LABEL[second]}의 근거가 비슷한 수준이에요.`);
  } else if (conflict && margin < d.conflictMixedMarginRatio) {
    classification = "mixed";
    reasons.push("사진 기반 근거와 자가 체크 근거가 서로 다른 유형을 가리켜 혼합형으로 정리했어요.");
  } else {
    classification = top;
    reasons.push(`${TYPE_LABEL[top]} 쪽 근거가 가장 많이 모였어요.`);
    if (scores[second] > 0) reasons.push(`두 번째로 가까운 경향은 ${TYPE_LABEL[second]}예요.`);
  }
  if (secondary && scores[secondary] <= 0) secondary = null;

  const visualUsed = input.quality.frontAnalyzed && d.qualityMultiplier[input.quality.frontLevel] > 0;
  let strength: EvidenceStrength = "weak";
  if (classification !== "inconclusive") {
    if (answered >= d.strongMinAnswers && visualUsed && margin >= d.strongMinMargin && !conflict) strength = "strong";
    else if (answered >= d.minSelfAnswers + 1 && margin >= d.mixedMarginRatio) strength = "moderate";
  }

  limitations.push(
    "이 결과는 참고용 경향 분석이에요. 포즈 랜드마크와 자가 체크만으로 골격 유형을 확정할 수 없어요.",
    "점수는 규칙이 일치한 정도를 더한 값으로, 확률이나 정확도가 아니에요.",
  );

  return {
    classification,
    primary,
    secondary,
    scores,
    visualScores: roundAll(visualScores),
    selfScores: roundAll(selfScores),
    evidence,
    strength,
    reasons,
    limitations,
    answeredCount: answered,
    totalQuestions: questions.length,
    rulesVersion: RULES_VERSION,
  };
}

function roundAll(s: TypeScores): TypeScores {
  return { straight: round2(s.straight), wave: round2(s.wave), natural: round2(s.natural) };
}
