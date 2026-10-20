"use client";

import { useSyncExternalStore } from "react";
import type { BodyType, Classification, ClassificationResult, EvidenceStrength, TypeScores } from "../classifier/types";
import type { StylePreferences } from "../styling/types";

/**
 * 사용자가 명시적으로 동의한 경우에만 localStorage에 저장하는 "최소 정보".
 * 사진, 영상, 랜드마크 좌표, 측정 원본 값은 저장하지 않습니다.
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
}

const KEY = "framefit:saved:v1";
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
  write([entry, ...read().filter((r) => r.id !== entry.id)].slice(0, 20));
}

export function deleteSaved(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function deleteAllSaved() {
  write([]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
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
