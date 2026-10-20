import { TYPE_LABEL } from "../classifier/engine";
import { BODY_TYPES, type BodyType, type Classification, type TypeScores } from "../classifier/types";
import { GARMENTS } from "./garments.data";
import { NEUTRAL_POINTS, STYLE_POINTS } from "./stylePoints.data";
import type {
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
} from "./types";

export const OCCASION_LABEL: Record<Occasion, string> = {
  casual: "캐주얼",
  business: "비즈니스",
  date: "데이트",
  formal: "포멀",
};
export const GOAL_LABEL: Record<SilhouetteGoal, string> = {
  neat: "단정함",
  volume: "볼륨 강조",
  long: "길어 보이는 비율",
  comfort: "편안함",
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
  soft: "소프트",
  street: "스트리트",
  natural: "내추럴 무드",
};

/** 추천 가중치 — 검증되지 않은 초기값 */
export const RECOMMEND_WEIGHTS = {
  primary: 1,
  secondary: 0.45,
  mixedEach: 0.8,
  goal: 0.6,
  focus: 0.5,
  taste: 0.35,
  reusePenalty: 2.5,
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

export function scoreGarment(g: Garment, weights: TypeScores, prefs: StylePreferences): ScoredGarment {
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
    const sg = scoreGarment(g, ctx.weights, ctx.prefs);
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
      const sg = scoreGarment(g, ctx.weights, ctx.prefs);
      const adj = sg.score - (ctx.usage.get(g.id) ?? 0) * RECOMMEND_WEIGHTS.reusePenalty - (g.occasions.includes(occasion) ? 0 : 1.5);
      return { ...sg, adj };
    });
}

/** 상의+하의 또는 원피스 조합 중, 아직 제안하지 않은 가장 좋은 조합 */
function pickCore(ctx: BuildContext, occasion: Occasion, chosen: Set<string>): ScoredGarment[] | null {
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
  for (const c of candidates) {
    if (chosen.has(c.key)) continue;
    if (!best || c.adj > best.adj || (c.adj === best.adj && c.key < best.key)) best = c;
  }
  if (!best) return null;
  chosen.add(best.key);
  return best.parts;
}

function buildOne(ctx: BuildContext, occasion: Occasion, variant: number, fromCloset: boolean, chosen: Set<string>): Outfit | null {
  const core = pickCore(ctx, occasion, chosen);
  if (!core) return null;
  const parts: ScoredGarment[] = [...core];

  const outer = pickBest(ctx, "outer", occasion);
  const needsOuter = occasion === "business" || occasion === "formal";
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
    title: `${OCCASION_LABEL[occasion]} · ${lead.garment.effect}`,
    occasion,
    concept: mainParts.map((p) => p.garment.name).join(" + "),
    items: parts.map((p) => toItem(p, ctx.result)),
    effect: effects.join(", "),
    score,
    fromCloset,
  };
}

export interface RecommendInput {
  result: ResultLike | null;
  prefs: StylePreferences;
  catalog?: Garment[];
}

/** 선택한 상황별로 코디를 생성. 최소 `minCount`개 (기본 3) */
export function recommendOutfits(input: RecommendInput, minCount = 3): Outfit[] {
  const catalog = input.catalog ?? GARMENTS;
  const occasions: Occasion[] = input.prefs.occasions.length ? input.prefs.occasions : ["casual"];
  const ctx: BuildContext = {
    result: input.result,
    prefs: input.prefs,
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
      .map((g) => scoreGarment(g, weights, input.prefs))
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
