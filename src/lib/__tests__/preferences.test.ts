import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  excludeOutfit,
  isExcluded,
  isSaved,
  lookbookKey,
  normalizePreferences,
  removeSavedOutfit,
  resetPreferences,
  restoreOutfit,
  setFitPreference,
  toggleDislikedGarment,
  toggleSavedOutfit,
} from "../preferences/model";
import { recommendOutfits } from "../styling/recommend";

const NOW = "2026-10-20T00:00:00.000Z";
const outfit = recommendOutfits({ result: null, prefs: DEFAULT_PREFERENCES.style })[0];
const ctx = { primary: null, typeLabel: "유형 기준 없음" };

describe("preferences model", () => {
  it("코디 저장/저장 취소 토글", () => {
    const a = toggleSavedOutfit(DEFAULT_PREFERENCES, outfit, ctx, NOW);
    expect(isSaved(a, outfit)).toBe(true);
    expect(a.lookbook[0].garmentIds).toEqual(outfit.items.map((i) => i.garment.id));
    expect(JSON.stringify(a)).not.toContain("data:image");
    const b = toggleSavedOutfit(a, outfit, ctx, NOW);
    expect(isSaved(b, outfit)).toBe(false);
    expect(removeSavedOutfit(a, lookbookKey(outfit), NOW).lookbook).toEqual([]);
  });

  it("제외하면 코디북에서도 빠지고, 되돌릴 수 있음", () => {
    const saved = toggleSavedOutfit(DEFAULT_PREFERENCES, outfit, ctx, NOW);
    const ex = excludeOutfit(saved, outfit, NOW);
    expect(isExcluded(ex, outfit.coreKey)).toBe(true);
    expect(ex.lookbook).toEqual([]);
    expect(excludeOutfit(ex, outfit, NOW)).toBe(ex); // 중복 제외 없음
    expect(isExcluded(restoreOutfit(ex, outfit.coreKey, NOW), outfit.coreKey)).toBe(false);
  });

  it("선호 핏·덜 추천 아이템 기록", () => {
    const f = setFitPreference(DEFAULT_PREFERENCES, "slim", NOW);
    expect(f.fitPreference).toBe("slim");
    const d = toggleDislikedGarment(f, "tee-crew", NOW);
    expect(d.dislikedGarments).toEqual(["tee-crew"]);
    expect(toggleDislikedGarment(d, "tee-crew", NOW).dislikedGarments).toEqual([]);
  });

  it("손상되거나 예전 형식의 값도 안전하게 정리", () => {
    const n = normalizePreferences({ persist: "yes", typeMode: "weird", mixedPair: ["wave"], fitPreference: "huge", lookbook: [{ bad: 1 }], style: { tastes: ["soft"] } });
    expect(n.persist).toBe(false);
    expect(n.typeMode).toBe("auto");
    expect(n.mixedPair).toEqual(["straight", "wave"]);
    expect(n.fitPreference).toBeNull();
    expect(n.lookbook).toEqual([]);
    expect(n.style.tastes).toEqual([]);
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
  });

  it("초기화해도 저장 위치 설정은 유지", () => {
    const s = { ...toggleSavedOutfit(DEFAULT_PREFERENCES, outfit, ctx, NOW), persist: true };
    const r = resetPreferences(s);
    expect(r.persist).toBe(true);
    expect(r.lookbook).toEqual([]);
  });
});
