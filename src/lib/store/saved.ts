"use client";

import { useSyncExternalStore } from "react";
import type { BodyType, Classification, ClassificationResult, EvidenceStrength, TypeScores } from "../classifier/types";
import type { CaptureView } from "../pose/quality";
import type { StylePreferences } from "../styling/types";
import { deleteRecordDetails, deleteRecordPhotos, detailFromSession, getRecordDetail, putRecordDetail } from "./recordDetail";
import { updateSession, type SessionState } from "./session";

/**
 * 검사 기록 목록: localStorage에 남기는 결과 요약.
 * - 기본으로 검사를 마칠 때마다 자동 기록되며, '내 결과'에서 자동 기록을 끄거나 개별·전체 삭제할 수 있습니다.
 * - 관절 좌표·측정값·응답(항상)과 사진(선택)은 상세 데이터로 IndexedDB에 따로 보관합니다 (lib/store/recordDetail.ts).
 * - 영상은 기록하지 않으며, 어떤 데이터도 서버로 전송하지 않습니다.
 */
export interface SavedResult {
  id: string;
  savedAt: string;
  classification: Classification;
  primary: BodyType | null;
  secondary: BodyType | null;
  strength: EvidenceStrength;
  scores: TypeScores;
  /** 근거 문장 요약 (최대 6개) */
  highlights: string[];
  prefs: StylePreferences;
  closet: string[];
  rulesVersion: string;
  /** 상세 기록 여부: 좌표·측정값이 있는지, 사진이 있는 촬영 방향 (예전 기록에는 없음) */
  detail?: { analysis: boolean; photos: CaptureView[] };
}

const KEY = "framefit:saved:v1";
/** 자동 기록 설정. 끈 경우에만 "off"를 저장 (기본 켜짐) */
const AUTO_KEY = "framefit:autorecord:v1";
/** 사진 기록 설정. 켠 경우에만 "on"을 저장 (기본 꺼짐) */
const PHOTO_KEY = "framefit:recordphotos:v1";
export const SAVED_LIMIT = 50;
const listeners = new Set<() => void>();
let cache: SavedResult[] | null = null;
const EMPTY: SavedResult[] = [];

function read(): SavedResult[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as SavedResult[]) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(list: SavedResult[]) {
  cache = list;
  try {
    if (list.length) window.localStorage.setItem(KEY, JSON.stringify(list));
    else window.localStorage.removeItem(KEY);
  } catch {
    throw new Error("브라우저 저장 공간에 접근할 수 없어요. 비공개 모드에서는 저장이 제한될 수 있어요.");
  }
  listeners.forEach((l) => l());
}

export function toSavedResult(
  result: ClassificationResult,
  prefs: StylePreferences,
  closet: string[],
  id: string,
  savedAt: string,
): SavedResult {
  return {
    id,
    savedAt,
    classification: result.classification,
    primary: result.primary,
    secondary: result.secondary,
    strength: result.strength,
    scores: result.scores,
    highlights: result.evidence
      .filter((e) => e.source !== "system")
      .slice(0, 6)
      .map((e) => `${e.topic}: ${e.detail}`),
    prefs,
    closet,
    rulesVersion: result.rulesVersion,
  };
}

export function saveResult(entry: SavedResult) {
  const list = [entry, ...read().filter((r) => r.id !== entry.id)];
  write(list.slice(0, SAVED_LIMIT));
  // 개수 제한으로 빠진 기록의 상세 데이터(좌표·사진)도 함께 정리
  const dropped = list.slice(SAVED_LIMIT).map((r) => r.id);
  if (dropped.length) void deleteRecordDetails(dropped);
}

function patchSaved(id: string, patch: Partial<SavedResult>) {
  const list = read();
  if (list.some((r) => r.id === id)) write(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

/** 한 번의 검사 결과에 대한 기록 id (같은 결과를 여러 번 저장해도 하나만 남음) */
export function recordIdFor(resultAt: string): string {
  return `rec-${resultAt}`;
}

/**
 * 세션의 검사 결과를 기록: 요약은 localStorage, 좌표·응답(+선택 시 사진)은 IndexedDB.
 * 상세 저장은 비동기로 진행하고, 실패하면 요약의 detail 표시만 고칩니다.
 */
export function recordSession(session: SessionState, prefs: StylePreferences, closet: string[]): string | null {
  if (!session.result) return null;
  const resultAt = session.resultAt ?? new Date().toISOString();
  const id = recordIdFor(resultAt);
  const detail = detailFromSession(id, session, readSettings().photos);
  const photos = (Object.keys(detail?.photos ?? {}) as CaptureView[]).filter((v) => detail?.photos[v]);
  saveResult({
    ...toSavedResult(session.result, prefs, closet, id, resultAt),
    detail: { analysis: Object.keys(detail?.analyses ?? {}).length > 0, photos },
  });
  if (detail) {
    putRecordDetail(detail).catch(() => patchSaved(id, { detail: undefined }));
  }
  return id;
}

/** 검사를 마쳤을 때 호출: 자동 기록이 켜져 있으면 기록하고 id를 반환 */
export function autoRecordSession(session: SessionState, prefs: StylePreferences, closet: string[]): string | null {
  if (!readSettings().auto) return null;
  try {
    return recordSession(session, prefs, closet);
  } catch {
    // 비공개 모드 등으로 저장할 수 없으면 기록 없이 진행 (결과 화면은 세션으로 동작)
    return null;
  }
}

/** 기록을 결과 화면에서 다시 볼 수 있도록 세션으로 불러옴. 상세 데이터가 없으면 false */
export async function openRecordInSession(id: string): Promise<boolean> {
  const summary = read().find((r) => r.id === id);
  const d = await getRecordDetail(id);
  if (!summary || !d) return false;
  updateSession(() => ({
    version: 1,
    captures: d.photos,
    analyses: d.analyses,
    fittedClothing: d.fittedClothing,
    answers: d.answers,
    result: d.result,
    resultAt: summary.savedAt,
  }));
  return true;
}

export async function deleteSavedPhotos(id: string) {
  await deleteRecordPhotos(id);
  const r = read().find((x) => x.id === id);
  if (r?.detail) patchSaved(id, { detail: { ...r.detail, photos: [] } });
}

export interface RecordSettings {
  /** 검사 후 자동 기록 (기본 켜짐) */
  auto: boolean;
  /** 사진도 함께 기록 (기본 꺼짐) */
  photos: boolean;
}
const DEFAULT_SETTINGS: RecordSettings = { auto: true, photos: false };
let settingsCache: RecordSettings | null = null;

function readSettings(): RecordSettings {
  if (settingsCache) return settingsCache;
  try {
    settingsCache = { auto: window.localStorage.getItem(AUTO_KEY) !== "off", photos: window.localStorage.getItem(PHOTO_KEY) === "on" };
  } catch {
    settingsCache = DEFAULT_SETTINGS;
  }
  return settingsCache;
}

export function setRecordSettings(patch: Partial<RecordSettings>) {
  const next = { ...readSettings(), ...patch };
  settingsCache = next;
  try {
    if (next.auto) window.localStorage.removeItem(AUTO_KEY);
    else window.localStorage.setItem(AUTO_KEY, "off");
    if (next.photos) window.localStorage.setItem(PHOTO_KEY, "on");
    else window.localStorage.removeItem(PHOTO_KEY);
  } catch {
    // 저장소 접근 불가: 이 탭에서만 적용
  }
  listeners.forEach((l) => l());
}

export function useRecordSettings(): RecordSettings {
  return useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);
}

export function deleteSaved(id: string) {
  write(read().filter((r) => r.id !== id));
  void deleteRecordDetails([id]);
}

export function deleteAllSaved() {
  write([]);
  void deleteRecordDetails("all");
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === AUTO_KEY || e.key === PHOTO_KEY) {
      cache = null;
      settingsCache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSavedResults(): SavedResult[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
