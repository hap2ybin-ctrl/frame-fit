import { TYPE_LABEL } from "../classifier/engine";
import { BODY_TYPES, type BodyType, type Classification, type TypeScores } from "../classifier/types";
import { FIT_TIPS, GOAL_TIPS } from "./fitGuide.data";
import { GARMENTS } from "./garments.data";
import { CURATED_LOOKS, type CuratedLook } from "./looks.data";
import { NEUTRAL_POINTS, STYLE_POINTS } from "./stylePoints.data";
import type {
  FitClass,
  FocusArea,
  Garment,
  Occasion,
  Outfit,
  OutfitItem,
  SilhouetteGoal,
  Slot,
  StylePoint,
  StylePreferences,
  Taste,
  TypeMode,
} from "./types";

export const OCCASION_LABEL: Record<Occasion, string> = {
  casual: "일상",
  business: "출근",
  date: "데이트",
  formal: "행사",
  travel: "여행",
};
export const GOAL_LABEL: Record<SilhouetteGoal, string> = {
  balance: "균형감",
  long: "길어 보이는 비율",
  volume: "볼륨감",
  neat: "단정함",
};
export const FOCUS_LABEL: Record<FocusArea, string> = {
  shoulder: "어깨선",
  neck: "목선",
  waist: "허리선",
  legs: "다리 라인",
};
export const TASTE_LABEL: Record<Taste, string> = {
  minimal: "미니멀",
  classic: "클래식",
  casual: "캐주얼",
  street: "스트리트",
  formal: "포멀",
};
export const FIT_LABEL: Record<FitClass, string> = {
  slim: "슬림핏",
  regular: "레귤러핏",
  over: "오버핏",
};

/** 저장된 선호값에 예전 버전의 값이 섞여 있어도 안전하게 정리 */
export function normalizePrefs(p: Partial<StylePreferences> | undefined): StylePreferences {
  const pick = <T extends string>(arr: unknown, labels: Record<T, string>): T[] =>
    Array.isArray(arr) ? (arr.filter((x) => typeof x === "string" && x in labels) as T[]) : [];
  const occasions = pick(p?.occasions, OCCASION_LABEL);
  return {
    line: p?.line === "women" || p?.line === "men" || p?.line === "unisex" ? p.line : "unisex",
    occasions: occasions.length ? occasions : ["casual"],
    goals: pick(p?.goals, GOAL_LABEL),
    focus: pick(p?.focus, FOCUS_LABEL),
    tastes: pick(p?.tastes, TASTE_LABEL),
  };
}

/** 추천 가중치 — 검증되지 않은 초기값 */
export const RECOMMEND_WEIGHTS = {
  primary: 1,
  secondary: 0.45,
  mixedEach: 0.8,
  goal: 0.6,
  focus: 0.5,
  taste: 0.35,
  reusePenalty: 2.5,
  /** 선호 핏으로 기록한 핏의 아이템 가산 */
  fitPreference: 0.5,
  /** "덜 추천"으로 표시한 아이템 감점 */
  dislikedPenalty: 3,
  accessoryMin: 1.6,
  outerMinCasual: 2.4,
} as const;

export interface ResultLike {
  classification: Classification;
  primary: BodyType | null;
  secondary: BodyType | null;
}

export function typeWeights(result: ResultLike | null): TypeScores {
  const w: TypeScores = { straight: 0, wave: 0, natural: 0 };
  if (!result || !result.primary || result.classification === "inconclusive") {
    // 판정 보류: 유형 가중치 없이 선호 조건만으로 추천
    return w;
  }
  if (result.classification === "mixed") {
    w[result.primary] = RECOMMEND_WEIGHTS.mixedEach;
    if (result.secondary) w[result.secondary] = RECOMMEND_WEIGHTS.mixedEach;
    return w;
  }
  w[result.primary] = RECOMMEND_WEIGHTS.primary;
  if (result.secondary) w[result.secondary] = RECOMMEND_WEIGHTS.secondary;
  return w;
}

export function lineMatches(g: Garment, line: StylePreferences["line"]): boolean {
  if (line === "unisex") return g.lines.includes("unisex");
  return g.lines.includes(line);
}

export interface ScoredGarment {
  garment: Garment;
  score: number;
  matched: string[];
}

/** 사용자 피드백 (취향 데이터 — 분석 데이터와 별도) */
export interface RecommendFeedback {
  /** 제외한 코디의 coreKey */
  excludedCores?: string[];
  /** 덜 추천할 아이템 id */
  dislikedGarments?: string[];
  fitPreference?: FitClass | null;
}

export function scoreGarment(g: Garment, weights: TypeScores, prefs: StylePreferences, feedback: RecommendFeedback = {}): ScoredGarment {
  let score = 0;
  const matched: string[] = [];
  let bestType: BodyType | null = null;
  for (const t of BODY_TYPES) {
    const s = weights[t] * g.affinity[t];
    score += s;
    if (weights[t] > 0 && g.affinity[t] >= 1.5 && (!bestType || weights[t] > weights[bestType])) bestType = t;
  }
  if (bestType) matched.push(`${TYPE_LABEL[bestType]} 경향`);
  for (const goal of prefs.goals) {
    if (g.goals.includes(goal)) {
      score += RECOMMEND_WEIGHTS.goal;
      matched.push(GOAL_LABEL[goal]);
    }
  }
  for (const f of prefs.focus) {
    if (g.focus.includes(f)) {
      score += RECOMMEND_WEIGHTS.focus;
      matched.push(`${FOCUS_LABEL[f]} 강조`);
    }
  }
  for (const t of prefs.tastes) {
    if (g.tastes.includes(t)) {
      score += RECOMMEND_WEIGHTS.taste;
      matched.push(TASTE_LABEL[t]);
    }
  }
  if (feedback.fitPreference && g.fitClass === feedback.fitPreference) {
    score += RECOMMEND_WEIGHTS.fitPreference;
    matched.push(`선호 ${FIT_LABEL[feedback.fitPreference]}`);
  }
  if (feedback.dislikedGarments?.includes(g.id)) score -= RECOMMEND_WEIGHTS.dislikedPenalty;
  return { garment: g, score: Math.round(score * 100) / 100, matched };
}

function whyFor(g: Garment, result: ResultLike | null): string {
  if (!result?.primary || result.classification === "inconclusive") {
    return `${g.effect}을(를) 노릴 수 있는 아이템이에요. 유형 판정이 보류되어 선택한 실루엣·취향을 기준으로 골랐어요.`;
  }
  return g.why[result.primary];
}

interface BuildContext {
  result: ResultLike | null;
  prefs: StylePreferences;
  feedback: RecommendFeedback;
  weights: TypeScores;
  catalog: Garment[];
  usage: Map<string, number>;
  strictOccasion: boolean;
}

function pickBest(ctx: BuildContext, slot: Slot, occasion: Occasion): ScoredGarment | null {
  let best: ScoredGarment | null = null;
  let bestAdj = -Infinity;
  for (const g of ctx.catalog) {
    if (g.slot !== slot || !lineMatches(g, ctx.prefs.line)) continue;
    const occOk = g.occasions.includes(occasion);
    if (ctx.strictOccasion && !occOk) continue;
    const sg = scoreGarment(g, ctx.weights, ctx.prefs, ctx.feedback);
    const adj = sg.score - (ctx.usage.get(g.id) ?? 0) * RECOMMEND_WEIGHTS.reusePenalty - (occOk ? 0 : 1.5);
    if (adj > bestAdj || (adj === bestAdj && best && g.id < best.garment.id)) {
      best = sg;
      bestAdj = adj;
    }
  }
  return best;
}

function toItem(sg: ScoredGarment, result: ResultLike | null): OutfitItem {
  return { garment: sg.garment, why: whyFor(sg.garment, result), matched: sg.matched };
}

function eligibleScored(ctx: BuildContext, slot: Slot, occasion: Occasion): Array<ScoredGarment & { adj: number }> {
  return ctx.catalog
    .filter((g) => g.slot === slot && lineMatches(g, ctx.prefs.line))
    .filter((g) => !ctx.strictOccasion || g.occasions.includes(occasion))
    .map((g) => {
      const sg = scoreGarment(g, ctx.weights, ctx.prefs, ctx.feedback);
      const adj = sg.score - (ctx.usage.get(g.id) ?? 0) * RECOMMEND_WEIGHTS.reusePenalty - (g.occasions.includes(occasion) ? 0 : 1.5);
      return { ...sg, adj };
    });
}

/** 상의+하의 또는 원피스 조합 중, 아직 제안하지 않았고 제외하지 않은 가장 좋은 조합 */
function pickCore(ctx: BuildContext, occasion: Occasion, chosen: Set<string>): { parts: ScoredGarment[]; key: string } | null {
  const candidates: Array<{ parts: ScoredGarment[]; adj: number; key: string }> = [];
  const tops = eligibleScored(ctx, "top", occasion);
  const bottoms = eligibleScored(ctx, "bottom", occasion);
  for (const t of tops) {
    for (const b of bottoms) {
      candidates.push({ parts: [t, b], adj: (t.adj + b.adj) / 2, key: `${t.garment.id}+${b.garment.id}` });
    }
  }
  if (ctx.prefs.line !== "men") {
    for (const d of eligibleScored(ctx, "dress", occasion)) {
      candidates.push({ parts: [d], adj: d.adj, key: d.garment.id });
    }
  }
  let best: (typeof candidates)[number] | null = null;
  const excluded = new Set(ctx.feedback.excludedCores ?? []);
  for (const c of candidates) {
    if (chosen.has(c.key) || excluded.has(c.key)) continue;
    if (!best || c.adj > best.adj || (c.adj === best.adj && c.key < best.key)) best = c;
  }
  if (!best) return null;
  chosen.add(best.key);
  return { parts: best.parts, key: best.key };
}

/** 코디 전체의 추천 이유 */
function outfitReason(ctx: Pick<BuildContext, "result" | "prefs">, occasion: Occasion, mainNames: string[]): string {
  const r = ctx.result;
  const typeText =
    r?.primary && r.classification !== "inconclusive"
      ? r.classification === "mixed" && r.secondary
        ? `${TYPE_LABEL[r.primary]}·${TYPE_LABEL[r.secondary]} 혼합 경향에 함께 어울리는`
        : `${TYPE_LABEL[r.primary]} 경향에 어울리는`
      : "유형 기준 없이 선택한 조건에 맞는";
  const goals = ctx.prefs.goals.map((g) => `'${GOAL_LABEL[g]}'`).join(", ");
  const tastes = ctx.prefs.tastes.map((t) => TASTE_LABEL[t]).join("·");
  const parts = [`${typeText} ${mainNames.join(" + ")} 조합이에요.`, `${OCCASION_LABEL[occasion]} 상황에 맞는 아이템으로 골랐어요.`];
  if (goals) parts.push(`원하는 효과 ${goals}에 맞춰 실루엣을 조정했어요.`);
  if (tastes) parts.push(`${tastes} 취향을 반영했어요.`);
  return parts.join(" ");
}

/** 코디의 핏 조절 방법: 유형별 부위 팁(최대 3) + 선택한 효과별 팁(최대 2) */
export function fitTipsFor(result: ResultLike | null, slots: Slot[], goals: SilhouetteGoal[]): string[] {
  const type = result?.primary && result.classification !== "inconclusive" ? result.primary : "neutral";
  const order: Slot[] = ["top", "dress", "bottom", "outer", "shoes", "accessory"];
  const tips = order
    .filter((s) => slots.includes(s))
    .map((s) => FIT_TIPS[type][s])
    .filter((t): t is string => !!t)
    .slice(0, 3);
  return [...tips, ...goals.slice(0, 2).map((g) => GOAL_TIPS[g])];
}

function buildOne(ctx: BuildContext, occasion: Occasion, variant: number, fromCloset: boolean, chosen: Set<string>): Outfit | null {
  const core = pickCore(ctx, occasion, chosen);
  if (!core) return null;
  const parts: ScoredGarment[] = [...core.parts];

  const outer = pickBest(ctx, "outer", occasion);
  const needsOuter = occasion === "business" || occasion === "formal";
  // 여행은 짐을 줄이도록 아우터를 기본으로 넣지 않음 (점수가 높을 때만)
  if (outer && (needsOuter || variant === 1 || outer.score >= RECOMMEND_WEIGHTS.outerMinCasual)) parts.push(outer);
  const shoes = pickBest(ctx, "shoes", occasion);
  if (shoes) parts.push(shoes);
  const acc = pickBest(ctx, "accessory", occasion);
  if (acc && acc.score >= RECOMMEND_WEIGHTS.accessoryMin) parts.push(acc);

  for (const p of parts) ctx.usage.set(p.garment.id, (ctx.usage.get(p.garment.id) ?? 0) + 1);

  const lead = [...parts].sort((a, b) => b.score - a.score)[0];
  const effects = [...new Set(parts.slice(0, 3).map((p) => p.garment.effect))].slice(0, 2);
  const score = Math.round((parts.reduce((s, p) => s + p.score, 0) / parts.length) * 100) / 100;
  const mainParts = parts.filter((p) => p.garment.slot !== "shoes" && p.garment.slot !== "accessory");
  return {
    id: `${fromCloset ? "closet" : "rec"}-${occasion}-${variant}-${parts.map((p) => p.garment.id).join("+")}`,
    coreKey: core.key,
    title: `${OCCASION_LABEL[occasion]} · ${lead.garment.effect}`,
    occasion,
    concept: mainParts.map((p) => p.garment.name).join(" + "),
    items: parts.map((p) => toItem(p, ctx.result)),
    effect: effects.join(", "),
    reason: outfitReason(ctx, occasion, mainParts.map((p) => p.garment.name)),
    fitTips: fitTipsFor(
      ctx.result,
      parts.map((p) => p.garment.slot),
      ctx.prefs.goals,
    ),
    score,
    fromCloset,
  };
}

export interface RecommendInput {
  result: ResultLike | null;
  prefs: StylePreferences;
  feedback?: RecommendFeedback;
  catalog?: Garment[];
}

/** 선택한 상황별로 코디를 생성. 최소 `minCount`개 (기본 3) */
export function recommendOutfits(input: RecommendInput, minCount = 3): Outfit[] {
  const catalog = input.catalog ?? GARMENTS;
  const occasions: Occasion[] = input.prefs.occasions.length ? input.prefs.occasions : ["casual"];
  const ctx: BuildContext = {
    result: input.result,
    prefs: input.prefs,
    feedback: input.feedback ?? {},
    weights: typeWeights(input.result),
    catalog,
    usage: new Map(),
    strictOccasion: true,
  };
  const perOccasion = Math.max(1, Math.ceil(minCount / occasions.length));
  const outfits: Outfit[] = [];
  for (const occ of occasions) {
    const chosen = new Set<string>();
    for (let v = 0; v < perOccasion; v++) {
      const o = buildOne(ctx, occ, v, false, chosen);
      if (o) outfits.push(o);
    }
  }
  return outfits;
}

export interface ClosetRecommendation {
  outfits: Outfit[];
  /** 옷장에 없어서 조합을 만들 수 없는 경우 안내 */
  missingSlots: Array<"top" | "bottom" | "shoes">;
  /** 옷장에 더하면 조합 폭이 넓어지는 아이템 */
  suggestions: Garment[];
}

/** 사용자가 체크한 보유 의류로만 조합 */
export function recommendFromCloset(input: RecommendInput & { closet: string[] }, maxCount = 3): ClosetRecommendation {
  const catalog = input.catalog ?? GARMENTS;
  const owned = new Set(input.closet);
  const ownedCatalog = catalog.filter((g) => owned.has(g.closetKey) && lineMatches(g, input.prefs.line));
  const has = (slot: Slot) => ownedCatalog.some((g) => g.slot === slot);
  const missingSlots: ClosetRecommendation["missingSlots"] = [];
  if (!has("top") && !has("dress")) missingSlots.push("top");
  if (!has("bottom") && !has("dress")) missingSlots.push("bottom");
  if (!has("shoes")) missingSlots.push("shoes");

  const weights = typeWeights(input.result);
  const ctx: BuildContext = {
    result: input.result,
    prefs: input.prefs,
    feedback: input.feedback ?? {},
    weights,
    catalog: ownedCatalog,
    usage: new Map(),
    strictOccasion: false,
  };
  const occasions: Occasion[] = input.prefs.occasions.length ? input.prefs.occasions : ["casual"];
  const outfits: Outfit[] = [];
  const chosen = new Set<string>();
  if (!missingSlots.includes("top") && !missingSlots.includes("bottom")) {
    for (let v = 0; v < maxCount; v++) {
      const o = buildOne(ctx, occasions[v % occasions.length], v, true, chosen);
      if (o) outfits.push(o);
    }
  }

  // 보유하지 않은 아이템 중 유형·선호 점수가 높은 것 (슬롯별 1개)
  const suggestions: Garment[] = [];
  for (const slot of ["top", "bottom", "outer", "shoes", "accessory"] as Slot[]) {
    const best = catalog
      .filter((g) => g.slot === slot && !owned.has(g.closetKey) && lineMatches(g, input.prefs.line))
      .map((g) => scoreGarment(g, weights, input.prefs, input.feedback))
      .sort((a, b) => b.score - a.score)[0];
    if (best) suggestions.push(best.garment);
  }
  for (const o of outfits) {
    const slots = new Set(o.items.map((i) => i.garment.slot));
    o.missing = suggestions.filter((s) => !slots.has(s.slot)).slice(0, 2);
  }
  return { outfits, missingSlots, suggestions: suggestions.slice(0, 3) };
}

export function stylePointsFor(result: ResultLike | null): { type: BodyType | null; points: StylePoint[] } {
  if (!result?.primary || result.classification === "inconclusive") return { type: null, points: NEUTRAL_POINTS };
  return { type: result.primary, points: STYLE_POINTS[result.primary] };
}

// ── 유형 기준 결정 ─────────────────────────────────────────────

export interface TypeContext {
  result: ResultLike | null;
  /** 어디서 온 유형 기준인지 */
  source: "session" | "saved" | "manual" | "none";
  label: string;
}

/**
 * 코디 추천에 쓸 유형 기준.
 * auto: 현재 세션 결과 → 저장된 최근 결과 → 없음(선호 조건만)
 * 직접 선택: 해당 유형, mixed: 고른 두 유형의 혼합형
 */
export function resolveTypeContext(
  mode: TypeMode,
  mixedPair: [BodyType, BodyType],
  sessionResult: ResultLike | null,
  savedResult: ResultLike | null,
): TypeContext {
  if (mode === "auto") {
    if (sessionResult) return { result: sessionResult, source: "session", label: "이번 분석 결과" };
    if (savedResult) return { result: savedResult, source: "saved", label: "저장된 최근 결과" };
    return { result: null, source: "none", label: "유형 기준 없음" };
  }
  if (mode === "mixed") {
    const [a, b] = mixedPair[0] === mixedPair[1] ? (["straight", "wave"] as [BodyType, BodyType]) : mixedPair;
    return { result: { classification: "mixed", primary: a, secondary: b }, source: "manual", label: `${TYPE_LABEL[a]}·${TYPE_LABEL[b]} 혼합형 (직접 선택)` };
  }
  return { result: { classification: mode, primary: mode, secondary: null }, source: "manual", label: `${TYPE_LABEL[mode]} (직접 선택)` };
}

/** 저장된 코디(아이템 id 목록)를 현재 카탈로그로 다시 구성 */
export function outfitFromSnapshot(snap: {
  coreKey: string;
  occasion: Occasion;
  garmentIds: string[];
  title: string;
  reason: string;
  fitTips: string[];
  primary: BodyType | null;
  look?: Outfit["look"];
}): Outfit | null {
  const garments = snap.garmentIds.map((id) => GARMENTS.find((g) => g.id === id)).filter((g): g is Garment => !!g);
  if (!garments.length) return null;
  const result: ResultLike | null = snap.primary ? { classification: snap.primary, primary: snap.primary, secondary: null } : null;
  const main = garments.filter((g) => g.slot !== "shoes" && g.slot !== "accessory");
  return {
    id: `saved-${snap.coreKey}-${snap.occasion}`,
    coreKey: snap.coreKey,
    title: snap.title,
    occasion: snap.occasion,
    concept: main.map((g) => g.name).join(" + "),
    items: garments.map((g) => ({ garment: g, why: whyFor(g, result), matched: [] })),
    effect: [...new Set(garments.slice(0, 3).map((g) => g.effect))].slice(0, 2).join(", "),
    reason: snap.reason,
    fitTips: snap.fitTips,
    score: 0,
    fromCloset: false,
    ...(snap.look ? { look: snap.look } : {}),
  };
}

// ── 완성 룩 큐레이션 추천 ──────────────────────────────────────

/** 추천 기준 유형에 맞는 모델 체형: 혼합형은 더 가까운(1순위) 유형, 판정 보류·없음은 유형 없음 모델 */
export function lookBodyType(result: ResultLike | null): BodyType | "neutral" {
  if (!result?.primary || result.classification === "inconclusive") return "neutral";
  return result.primary;
}

/** 룩 체형 일치 가산점 — 검증되지 않은 초기값 */
export const LOOK_WEIGHTS = { sameBody: 3, secondaryBody: 1.5, neutralBody: 0.5 } as const;

function lookGenders(line: StylePreferences["line"]): Array<"women" | "men"> {
  return line === "men" ? ["men"] : line === "women" ? ["women"] : ["women", "men"];
}

function garmentsOf(look: CuratedLook): Garment[] {
  return look.garmentIds.map((id) => GARMENTS.find((g) => g.id === id)).filter((g): g is Garment => !!g);
}

/**
 * 완성 룩 중에서 조건에 맞는 룩을 골라 코디로 제안합니다.
 * 모든 룩에는 체형별 AI 모델이 아이템 전부(아우터·신발·소품 포함)를 입은 모델컷이 있습니다.
 * - 같은 체형의 룩을 우선하고, 부족하면 다른 체형 룩으로 채웁니다.
 * - 효과·취향·선호 핏·덜 추천 아이템은 아이템 점수(scoreGarment)로, 제외한 코디는 coreKey로 반영합니다.
 * - 유니섹스는 모든 아이템이 유니섹스 라인인 룩을 우선합니다.
 * - round: "다른 코디 보기"를 누른 횟수. 점수 순 목록에서 다음 묶음을 보여 주고, 끝까지 가면 처음으로 돌아갑니다.
 */
export function recommendLooks(input: RecommendInput & { round?: number }, minCount = 3, looks: CuratedLook[] = CURATED_LOOKS): Outfit[] {
  return rankLooks(input, minCount, looks).flatMap(({ ranked, perOccasion }) => {
    if (!ranked.length) return [];
    const pages = Math.ceil(ranked.length / perOccasion);
    const start = (((input.round ?? 0) % pages) * perOccasion) % ranked.length;
    const n = Math.min(perOccasion, ranked.length);
    return Array.from({ length: n }, (_, i) => ranked[(start + i) % ranked.length]);
  });
}

/** 상황별로 "다른 코디 보기"로 넘겨 볼 수 있는 묶음 수 (가장 많은 상황 기준) */
export function lookRoundCount(input: RecommendInput, minCount = 3, looks: CuratedLook[] = CURATED_LOOKS): number {
  return Math.max(1, ...rankLooks(input, minCount, looks).map(({ ranked, perOccasion }) => Math.ceil(ranked.length / perOccasion)));
}

/** 상황별 후보 룩을 점수 순으로 정렬 (같은 상의+하의 조합은 가장 높은 것 하나만) */
function rankLooks(input: RecommendInput, minCount: number, looks: CuratedLook[]): Array<{ ranked: Outfit[]; perOccasion: number }> {
  const prefs = input.prefs;
  const feedback = input.feedback ?? {};
  const weights = typeWeights(input.result);
  const body = lookBodyType(input.result);
  const secondary = input.result?.classification === "mixed" ? input.result.secondary : null;
  const occasions: Occasion[] = prefs.occasions.length ? prefs.occasions : ["casual"];
  const genders = lookGenders(prefs.line);
  const excluded = new Set(feedback.excludedCores ?? []);
  const perOccasion = Math.max(1, Math.ceil(minCount / occasions.length));
  const ctx = { result: input.result, prefs };

  const groups: Array<{ ranked: Outfit[]; perOccasion: number }> = [];
  for (const occasion of occasions) {
    const outfits: Outfit[] = [];
    const scored = looks
      .filter((l) => l.occasion === occasion && genders.includes(l.gender) && !excluded.has(l.coreKey))
      .map((look) => {
        const garments = garmentsOf(look);
        const sgs = garments.map((g) => scoreGarment(g, weights, prefs, feedback));
        let score = sgs.reduce((a, b) => a + b.score, 0) / Math.max(sgs.length, 1);
        if (look.bodyType === body) score += LOOK_WEIGHTS.sameBody;
        else if (secondary && look.bodyType === secondary) score += LOOK_WEIGHTS.secondaryBody;
        else if (look.bodyType === "neutral") score += LOOK_WEIGHTS.neutralBody;
        if (prefs.line === "unisex" && garments.every((g) => g.lines.includes("unisex"))) score += 1;
        return { look, sgs, score };
      })
      .sort((a, b) => b.score - a.score || a.look.id.localeCompare(b.look.id));

    const cores = new Set<string>();
    for (const { look, sgs, score } of scored) {
      if (cores.has(look.coreKey)) continue;
      cores.add(look.coreKey);
      const main = sgs.filter((p) => p.garment.slot !== "shoes" && p.garment.slot !== "accessory");
      const lead = [...sgs].sort((a, b) => b.score - a.score)[0];
      outfits.push({
        id: `look-${look.id}`,
        coreKey: look.coreKey,
        title: `${OCCASION_LABEL[occasion]} · ${lead.garment.effect}`,
        occasion,
        concept: main.map((p) => p.garment.name).join(" + "),
        items: sgs.map((p) => toItem(p, input.result)),
        effect: [...new Set(sgs.slice(0, 3).map((p) => p.garment.effect))].slice(0, 2).join(", "),
        reason: outfitReason(ctx, occasion, main.map((p) => p.garment.name)),
        fitTips: fitTipsFor(
          input.result,
          sgs.map((p) => p.garment.slot),
          prefs.goals,
        ),
        score: Math.round(score * 100) / 100,
        fromCloset: false,
        look: { id: look.id, image: look.image, gender: look.gender, bodyType: look.bodyType },
      });
    }
    groups.push({ ranked: outfits, perOccasion });
  }
  return groups;
}
