"use client";

import { useSyncExternalStore } from "react";
import type { PhotoAnalysis } from "../analysis/analyzePhoto";
import type { ClassificationResult, SelfAnswer } from "../classifier/types";
import type { CapturedPhoto } from "../image/image";
import type { CaptureView } from "../pose/quality";

/**
 * 분석 세션 상태 — sessionStorage(탭을 닫으면 삭제)에만 보관합니다.
 * 사진·좌표는 절대 서버로 전송하지 않으며, localStorage에도 저장하지 않습니다.
 * 스타일 취향·옷장·코디북은 별도 모듈(lib/preferences)에서 관리합니다.
 */
export interface SessionState {
  version: 1;
  captures: Partial<Record<CaptureView, CapturedPhoto>>;
  analyses: Partial<Record<CaptureView, PhotoAnalysis>>;
  /** 몸에 붙는 옷을 입고 촬영했는지 (측면 윤곽 규칙 반영 여부) */
  fittedClothing: boolean;
  answers: SelfAnswer[];
  result: ClassificationResult | null;
  resultAt: string | null;
}

const KEY = "framefit:session:v1";

export const EMPTY_SESSION: SessionState = Object.freeze({
  version: 1,
  captures: {},
  analyses: {},
  fittedClothing: false,
  answers: [],
  result: null,
  resultAt: null,
}) as SessionState;

let state: SessionState | null = null;
let storageWarning: string | null = null;
const listeners = new Set<() => void>();

function load(): SessionState {
  if (state) return state;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SessionState) : null;
    state = parsed && parsed.version === 1 ? { ...EMPTY_SESSION, ...parsed } : EMPTY_SESSION;
  } catch {
    state = EMPTY_SESSION;
  }
  return state;
}

function persist(next: SessionState) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
    storageWarning = null;
  } catch {
    // 용량 초과·비공개 모드 등: 메모리에만 유지
    storageWarning = "브라우저 저장 공간이 부족해 새로고침하면 사진이 사라질 수 있어요.";
  }
}

export function getSession(): SessionState {
  return typeof window === "undefined" ? EMPTY_SESSION : load();
}

export function updateSession(updater: (prev: SessionState) => SessionState) {
  const next = updater(load());
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

export function clearSession() {
  state = EMPTY_SESSION;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export function getStorageWarning() {
  return storageWarning;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
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

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, getSession, () => EMPTY_SESSION);
}

const noopSubscribe = () => () => {};
/** 클라이언트 하이드레이션 이후 true — 세션 기반 리다이렉트/빈 상태 판단에 사용 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
