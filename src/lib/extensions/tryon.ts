/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  확장 모듈 인터페이스 (미구현)
 * ─────────────────────────────────────────────────────────────────────────────
 *  아래 기능은 MVP에 포함되지 않았으며, UI 어디에서도 작동하는 것처럼 노출하지 않습니다.
 *  구현 시 이 인터페이스를 따르는 provider를 만들고 FEATURE_FLAGS를 켜세요.
 *
 *  1. 사진 위 코디 실루엣 오버레이 — 분석 사진의 랜드마크 위에 추천 의복 실루엣(SVG)을 정렬
 *     (현재는 표준 도식 위의 실루엣 비교(/fit-lab)만 구현. 사용자 사진·신체는 변형하지 않음)
 *  2. 디지털 옷장            — 사용자가 보유 의류 사진·속성을 기기 안에 등록 (현재는 종류 체크만 지원)
 *  3. 쇼핑 링크 연동          — Garment.closetKey → 외부 상품 검색/제휴 링크
 *  4. 사진형 Virtual Try-On  — 의류 이미지 + 인물 사진 → 합성 이미지 (서버 모델 필요 가능성, 별도 동의 필수)
 *  5. 실시간 AR Try-On       — 실시간 랜드마크/분할 마스크에 의류 메시 또는 2D 워핑 적용
 */

import type { PoseLandmark } from "../pose/landmarks";
import type { Garment, Outfit } from "../styling/types";

export const FEATURE_FLAGS = {
  silhouetteOverlay: false,
  closetPhotos: false,
  shoppingLinks: false,
  photoTryOn: false,
  liveTryOn: false,
} as const;

export interface SilhouetteOverlayProvider {
  /** 정규화 좌표 랜드마크에 맞춰 의복 SVG path를 생성 */
  render(garments: Garment[], landmarks: PoseLandmark[], imageSize: { width: number; height: number }): string;
}

export interface PhotoTryOnProvider {
  /** 개인정보: 외부 전송이 필요하면 별도 동의 UI와 전송 범위 고지가 반드시 선행되어야 함 */
  readonly requiresUpload: boolean;
  tryOn(person: Blob, garmentImage: Blob, signal?: AbortSignal): Promise<Blob>;
}

export interface LiveTryOnProvider {
  attach(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void>;
  setGarment(garment: Garment | null): void;
  /** 매 프레임 랜드마크·마스크를 받아 렌더 */
  onFrame(landmarks: PoseLandmark[], mask: Float32Array | null, timestampMs: number): void;
  detach(): void;
}

export interface ShoppingLinkProvider {
  linksFor(garment: Garment): Promise<Array<{ label: string; url: string }>>;
}

/**
 * 의류 데이터 소스 — 현재는 정적 카탈로그(lib/styling/garments.data.ts).
 * 추후 쇼핑몰 상품 피드나 디지털 옷장으로 교체할 때 이 형태를 맞추면 추천 엔진(recommend.ts)을 그대로 쓸 수 있음.
 */
export interface GarmentCatalogSource {
  readonly id: string;
  list(): Promise<Garment[]>;
}

/** 디지털 옷장 — 사용자 소유 의류. 사진을 다룰 경우 기기 내 저장과 별도 동의가 필요 */
export interface DigitalClosetProvider {
  listOwned(): Promise<Array<Garment & { ownedItemId: string; photoBlobKey?: string }>>;
  add(item: Omit<Garment, "id"> & { photo?: Blob }): Promise<string>;
  remove(ownedItemId: string): Promise<void>;
}

/** AI 가상 피팅 API 어댑터 — 외부 전송이 필요하므로 별도 동의 화면과 전송 범위 고지가 선행되어야 함 */
export interface VirtualFittingApi {
  readonly name: string;
  readonly sendsDataExternally: true;
  render(outfit: Outfit, personPhoto: Blob, signal?: AbortSignal): Promise<Blob>;
}
