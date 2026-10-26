import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PhotoAnalysis } from "../analysis/analyzePhoto";
import { classify } from "../classifier/engine";
import type { QualitySummary } from "../classifier/types";
import { DEFAULT_PREFERENCES } from "../preferences/model";
import { detailFromSession } from "../store/recordDetail";
import { EMPTY_SESSION, type SessionState } from "../store/session";
import { syntheticPose } from "./fixtures";

const noPhoto: QualitySummary = { frontAnalyzed: false, frontLevel: "none", sideAnalyzed: false, sideLevel: "none", fittedClothing: false, notes: [] };
const result = classify({ visualFeatures: [], selfAssessment: [], quality: noPhoto });
const photo = { dataUrl: "data:image/jpeg;base64,AAAA", width: 960, height: 1280, source: "upload" as const, capturedAt: "t" };
const analysis = { view: "front", status: "ok", landmarks: syntheticPose(), imageWidth: 960, imageHeight: 1280 } as unknown as PhotoAnalysis;

function sessionAt(resultAt: string): SessionState {
  return { ...EMPTY_SESSION, captures: { front: photo }, analyses: { front: analysis }, answers: [{ questionId: "q", optionId: "o" }], result, resultAt };
}

/** node 환경용 최소 localStorage (IndexedDB는 없음 → 상세 저장은 실패 처리 경로) */
function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

async function load() {
  vi.resetModules();
  const storage = fakeStorage();
  vi.stubGlobal("window", { localStorage: storage, sessionStorage: fakeStorage(), addEventListener() {}, removeEventListener() {} });
  return { storage, mod: await import("../store/saved") };
}
const list = (s: ReturnType<typeof fakeStorage>) => JSON.parse(s.raw.get("framefit:saved:v1") ?? "[]");

describe("검사 기록", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("상세 데이터: 좌표·응답은 항상, 사진은 선택한 경우만", () => {
    const withPhotos = detailFromSession("a", sessionAt("t"), true)!;
    const noPhotos = detailFromSession("a", sessionAt("t"), false)!;
    expect(withPhotos.analyses.front?.landmarks).toHaveLength(33);
    expect(withPhotos.photos.front?.dataUrl).toBe(photo.dataUrl);
    expect(noPhotos.analyses.front?.landmarks).toHaveLength(33);
    expect(noPhotos.answers).toHaveLength(1);
    expect(noPhotos.photos).toEqual({});
    expect(detailFromSession("a", EMPTY_SESSION, true)).toBeNull();
  });

  it("기본으로 자동 기록되고, 목록 요약에는 사진이 들어가지 않음", async () => {
    const { storage, mod } = await load();
    const id = mod.autoRecordSession(sessionAt("2026-10-26T01:00:00.000Z"), DEFAULT_PREFERENCES.style, []);
    expect(id).toBe(mod.recordIdFor("2026-10-26T01:00:00.000Z"));
    const saved = list(storage);
    expect(saved).toHaveLength(1);
    expect(saved[0].classification).toBe(result.classification);
    expect(saved[0].detail).toEqual({ analysis: true, photos: [] });
    expect(storage.raw.get("framefit:saved:v1")).not.toMatch(/data:image/);
  });

  it("사진 기록을 켜면 사진이 있는 방향이 표시됨", async () => {
    const { storage, mod } = await load();
    mod.setRecordSettings({ photos: true });
    expect(storage.raw.get("framefit:recordphotos:v1")).toBe("on");
    mod.autoRecordSession(sessionAt("t1"), DEFAULT_PREFERENCES.style, []);
    expect(list(storage)[0].detail.photos).toEqual(["front"]);
  });

  it("같은 검사는 한 번만 기록되고, 자동 기록을 끄면 기록하지 않음", async () => {
    const { storage, mod } = await load();
    mod.autoRecordSession(sessionAt("t1"), DEFAULT_PREFERENCES.style, []);
    mod.autoRecordSession(sessionAt("t1"), DEFAULT_PREFERENCES.style, []);
    expect(list(storage)).toHaveLength(1);

    mod.setRecordSettings({ auto: false });
    expect(storage.raw.get("framefit:autorecord:v1")).toBe("off");
    expect(mod.autoRecordSession(sessionAt("t2"), DEFAULT_PREFERENCES.style, [])).toBeNull();
    expect(list(storage)).toHaveLength(1);

    // 자동 기록을 꺼도 직접 기록은 가능
    expect(mod.recordSession(sessionAt("t3"), DEFAULT_PREFERENCES.style, [])).toBe(mod.recordIdFor("t3"));
    expect(list(storage)).toHaveLength(2);

    mod.setRecordSettings({ auto: true });
    expect(storage.raw.has("framefit:autorecord:v1")).toBe(false);
  });

  it("최근 기록만 최대 개수까지 보관", async () => {
    const { storage, mod } = await load();
    for (let i = 0; i < mod.SAVED_LIMIT + 5; i++) mod.autoRecordSession(sessionAt(`t${i}`), DEFAULT_PREFERENCES.style, []);
    const saved = list(storage);
    expect(saved).toHaveLength(mod.SAVED_LIMIT);
    expect(saved[0].id).toBe(mod.recordIdFor(`t${mod.SAVED_LIMIT + 4}`));
  });
});
