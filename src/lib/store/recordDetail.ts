"use client";

import type { PhotoAnalysis } from "../analysis/analyzePhoto";
import type { ClassificationResult, SelfAnswer } from "../classifier/types";
import { dataUrlToImage, drawToJpeg, type CapturedPhoto } from "../image/image";
import type { CaptureView } from "../pose/quality";
import type { SessionState } from "./session";

/**
 * 검사 기록의 상세 데이터 — 이 브라우저의 IndexedDB(framefit-records)에만 보관합니다. 서버로 전송하지 않습니다.
 * - 항상: 관절 좌표·측정값(분석 결과), 자가 체크 응답, 전체 판정 결과 → 지난 검사를 결과 화면으로 다시 열 수 있음
 * - 선택: 촬영 사진 ('사진도 함께 기록'을 켠 경우만, 긴 변 960px로 줄여서)
 * 영상은 기록하지 않습니다. 목록용 요약은 lib/store/saved.ts(localStorage)에 있습니다.
 */
export interface RecordDetail {
  id: string;
  result: ClassificationResult;
  analyses: Partial<Record<CaptureView, PhotoAnalysis>>;
  answers: SelfAnswer[];
  fittedClothing: boolean;
  photos: Partial<Record<CaptureView, CapturedPhoto>>;
}

export const RECORD_PHOTO_EDGE = 960;
const DB = "framefit-records";
const STORE = "details";

/** 세션에서 기록할 상세 데이터를 고름 (사진은 includePhotos일 때만) */
export function detailFromSession(id: string, session: SessionState, includePhotos: boolean): RecordDetail | null {
  if (!session.result) return null;
  const analyses: RecordDetail["analyses"] = {};
  for (const v of ["front", "side"] as const) {
    const a = session.analyses[v];
    if (a?.status === "ok" && a.landmarks) analyses[v] = a;
  }
  return {
    id,
    result: session.result,
    analyses,
    answers: session.answers,
    fittedClothing: session.fittedClothing,
    photos: includePhotos ? { ...session.captures } : {},
  };
}

async function shrink(photo: CapturedPhoto): Promise<CapturedPhoto> {
  if (Math.max(photo.width, photo.height) <= RECORD_PHOTO_EDGE) return photo;
  const img = await dataUrlToImage(photo.dataUrl);
  return { ...photo, ...drawToJpeg(img, photo.width, photo.height, 0.82, RECORD_PHOTO_EDGE) };
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB를 쓸 수 없어요."));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function putRecordDetail(detail: RecordDetail): Promise<void> {
  const photos: RecordDetail["photos"] = {};
  for (const [v, p] of Object.entries(detail.photos) as Array<[CaptureView, CapturedPhoto | undefined]>) {
    if (p) photos[v] = await shrink(p);
  }
  await tx("readwrite", (s) => s.put({ ...detail, photos }));
}

export async function getRecordDetail(id: string): Promise<RecordDetail | null> {
  try {
    return ((await tx<RecordDetail>("readonly", (s) => s.get(id))) as RecordDetail | undefined) ?? null;
  } catch {
    return null;
  }
}

/** 사진만 지우기 (좌표·응답은 유지) */
export async function deleteRecordPhotos(id: string): Promise<void> {
  const d = await getRecordDetail(id);
  if (d) await tx("readwrite", (s) => s.put({ ...d, photos: {} }));
}

export async function deleteRecordDetails(ids: string[] | "all"): Promise<void> {
  try {
    await tx("readwrite", (s) => {
      if (ids === "all") s.clear();
      else ids.forEach((id) => s.delete(id));
    });
  } catch {
    /* IndexedDB 없음: 지울 것도 없음 */
  }
}
