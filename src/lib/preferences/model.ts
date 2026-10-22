import type { BodyType } from "../classifier/types";
import { normalizePrefs } from "../styling/recommend";
import type { FitClass, Occasion, Outfit, StylePreferences, TypeMode } from "../styling/types";

/**
 * 사용자 취향·피드백 데이터 모델 (순수 함수).
 * 분석 데이터(사진·좌표·결과)와 분리해서 관리합니다. 사진과 좌표는 절대 여기에 들어오지 않습니다.
 */

export interface SavedOutfit {
  coreKey: string;
  occasion: Occasion;
  garmentIds: string[];
  title: string;
  reason: string;
  fitTips: string[];
  /** 저장 당시 유형 기준 (코디 설명 재구성용) */
  primary: BodyType | null;
  typeLabel: string;
  savedAt: string;
  /** 완성 룩이면 모델컷 정보 */
  look?: Outfit["look"];
}

export interface ExcludedOutfit {
  coreKey: string;
  concept: string;
  excludedAt: string;
}

export interface PreferenceState {
  version: 1;
  /** true면 이 기기(localStorage)에 보관, false면 이 탭(sessionStorage)에만 보관 */
  persist: boolean;
  style: StylePreferences;
  typeMode: TypeMode;
  mixedPair: [BodyType, BodyType];
  closet: string[];
  fitPreference: FitClass | null;
  lookbook: SavedOutfit[];
  excludedOutfits: ExcludedOutfit[];
  dislikedGarments: string[];
  updatedAt: string | null;
}

export const DEFAULT_PREFERENCES: PreferenceState = {
  version: 1,
  persist: false,
  style: { line: "unisex", occasions: ["casual"], goals: [], focus: [], tastes: [] },
  typeMode: "auto",
  mixedPair: ["straight", "wave"],
  closet: [],
  fitPreference: null,
  lookbook: [],
  excludedOutfits: [],
  dislikedGarments: [],
  updatedAt: null,
};

const TYPES: BodyType[] = ["straight", "wave", "natural"];
const MODES: TypeMode[] = ["auto", "straight", "wave", "natural", "mixed"];
const FITS: FitClass[] = ["slim", "regular", "over"];
export const LOOKBOOK_LIMIT = 60;

/** 저장소에서 읽은 값을 검증·정리 (예전 버전 값이나 손상된 값에도 안전) */
export function normalizePreferences(raw: unknown): PreferenceState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<PreferenceState>;
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const pair = Array.isArray(r.mixedPair) && r.mixedPair.length === 2 && r.mixedPair.every((t) => TYPES.includes(t)) ? r.mixedPair : DEFAULT_PREFERENCES.mixedPair;
  return {
    version: 1,
    persist: r.persist === true,
    style: normalizePrefs(r.style),
    typeMode: MODES.includes(r.typeMode as TypeMode) ? (r.typeMode as TypeMode) : "auto",
    mixedPair: [pair[0], pair[1]],
    closet: strArr(r.closet),
    fitPreference: FITS.includes(r.fitPreference as FitClass) ? (r.fitPreference as FitClass) : null,
    lookbook: Array.isArray(r.lookbook) ? r.lookbook.filter((o) => o && typeof o.coreKey === "string" && Array.isArray(o.garmentIds)) : [],
    excludedOutfits: Array.isArray(r.excludedOutfits) ? r.excludedOutfits.filter((o) => o && typeof o.coreKey === "string") : [],
    dislikedGarments: strArr(r.dislikedGarments),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
  };
}

export function lookbookKey(o: { coreKey: string; occasion: Occasion }): string {
  return `${o.coreKey}@${o.occasion}`;
}

export function isSaved(state: PreferenceState, o: { coreKey: string; occasion: Occasion }): boolean {
  const k = lookbookKey(o);
  return state.lookbook.some((s) => lookbookKey(s) === k);
}

export function isExcluded(state: PreferenceState, coreKey: string): boolean {
  return state.excludedOutfits.some((e) => e.coreKey === coreKey);
}

function touch(s: PreferenceState, now: string): PreferenceState {
  return { ...s, updatedAt: now };
}

/** 코디 저장/저장 취소 토글 */
export function toggleSavedOutfit(
  state: PreferenceState,
  outfit: Outfit,
  ctx: { primary: BodyType | null; typeLabel: string },
  now: string,
): PreferenceState {
  const k = lookbookKey(outfit);
  if (state.lookbook.some((s) => lookbookKey(s) === k)) {
    return touch({ ...state, lookbook: state.lookbook.filter((s) => lookbookKey(s) !== k) }, now);
  }
  const entry: SavedOutfit = {
    coreKey: outfit.coreKey,
    occasion: outfit.occasion,
    garmentIds: outfit.items.map((i) => i.garment.id),
    title: outfit.title,
    reason: outfit.reason,
    fitTips: outfit.fitTips,
    primary: ctx.primary,
    typeLabel: ctx.typeLabel,
    savedAt: now,
    ...(outfit.look ? { look: outfit.look } : {}),
  };
  return touch({ ...state, lookbook: [entry, ...state.lookbook].slice(0, LOOKBOOK_LIMIT) }, now);
}

export function removeSavedOutfit(state: PreferenceState, key: string, now: string): PreferenceState {
  return touch({ ...state, lookbook: state.lookbook.filter((s) => lookbookKey(s) !== key) }, now);
}

/** 마음에 들지 않는 코디 제외: 이후 추천에서 같은 상의+하의 조합을 빼고, 코디북에서도 제거 */
export function excludeOutfit(state: PreferenceState, outfit: Outfit, now: string): PreferenceState {
  if (isExcluded(state, outfit.coreKey)) return state;
  return touch(
    {
      ...state,
      excludedOutfits: [{ coreKey: outfit.coreKey, concept: outfit.concept, excludedAt: now }, ...state.excludedOutfits],
      lookbook: state.lookbook.filter((s) => s.coreKey !== outfit.coreKey),
    },
    now,
  );
}

export function restoreOutfit(state: PreferenceState, coreKey: string, now: string): PreferenceState {
  return touch({ ...state, excludedOutfits: state.excludedOutfits.filter((e) => e.coreKey !== coreKey) }, now);
}

export function setFitPreference(state: PreferenceState, fit: FitClass | null, now: string): PreferenceState {
  return touch({ ...state, fitPreference: fit }, now);
}

export function toggleDislikedGarment(state: PreferenceState, garmentId: string, now: string): PreferenceState {
  const has = state.dislikedGarments.includes(garmentId);
  return touch(
    { ...state, dislikedGarments: has ? state.dislikedGarments.filter((g) => g !== garmentId) : [...state.dislikedGarments, garmentId] },
    now,
  );
}

/** 취향·피드백만 초기화 (저장 위치 설정은 유지) */
export function resetPreferences(state: PreferenceState): PreferenceState {
  return { ...DEFAULT_PREFERENCES, persist: state.persist };
}
