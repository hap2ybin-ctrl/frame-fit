"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PREFERENCES, normalizePreferences, type PreferenceState } from "./model";

/**
 * 취향·코디북 저장소.
 * - persist=false(기본): sessionStorage — 탭을 닫으면 사라짐
 * - persist=true(사용자가 켠 경우): localStorage — 이 기기 브라우저에 유지
 * 분석 데이터(세션 스토어)와 다른 키를 쓰며, 사진·좌표는 저장하지 않습니다.
 */
const LOCAL_KEY = "framefit:prefs:v1";
const SESSION_KEY = "framefit:prefs:session:v1";
/** 1단계에서 세션 스토어에 있던 스타일 선호·옷장을 처음 한 번 가져옴 */
const LEGACY_SESSION_KEY = "framefit:session:v1";

let state: PreferenceState | null = null;
const listeners = new Set<() => void>();

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function load(): PreferenceState {
  if (state) return state;
  const local = readJson(window.localStorage, LOCAL_KEY);
  if (local) {
    state = { ...normalizePreferences(local), persist: true };
    return state;
  }
  const session = readJson(window.sessionStorage, SESSION_KEY);
  if (session) {
    state = { ...normalizePreferences(session), persist: false };
    return state;
  }
  const legacy = readJson(window.sessionStorage, LEGACY_SESSION_KEY) as { prefs?: unknown; closet?: unknown } | null;
  state = legacy ? normalizePreferences({ style: legacy.prefs, closet: legacy.closet }) : DEFAULT_PREFERENCES;
  return state;
}

function write(next: PreferenceState) {
  try {
    if (next.persist) {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      window.localStorage.removeItem(LOCAL_KEY);
    }
  } catch {
    /* 저장 공간 접근 불가(비공개 모드 등): 메모리에만 유지 */
  }
}

export function getPreferences(): PreferenceState {
  return typeof window === "undefined" ? DEFAULT_PREFERENCES : load();
}

export function updatePreferences(updater: (prev: PreferenceState) => PreferenceState) {
  const next = updater(load());
  state = next;
  write(next);
  listeners.forEach((l) => l());
}

/** 이 기기에 저장 켜기/끄기. 끄면 localStorage 사본을 지우고 이 탭에만 남김 */
export function setPersist(persist: boolean) {
  updatePreferences((s) => ({ ...s, persist }));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_KEY) {
      state = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferences(): PreferenceState {
  return useSyncExternalStore(subscribe, getPreferences, () => DEFAULT_PREFERENCES);
}

export function nowIso() {
  return new Date().toISOString();
}
