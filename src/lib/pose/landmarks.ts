/**
 * MediaPipe Pose Landmarker 33개 랜드마크 인덱스와 연결 정보.
 * 참고: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
 *
 * "LEFT/RIGHT"는 화면 기준이 아니라 촬영된 사람 기준의 좌우입니다.
 */

export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export const LANDMARK_COUNT = 33;

/** 2D 정규화 좌표 랜드마크 (MediaPipe NormalizedLandmark와 구조 호환) */
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
  presence?: number;
}

/** 관절 연결선 (MediaPipe POSE_CONNECTIONS와 동일한 구성) */
export const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

/** HUD에서 강조 표시하는 주요 관절 */
export const KEY_JOINTS: ReadonlyArray<{ index: number; label: string }> = [
  { index: LM.NOSE, label: "머리" },
  { index: LM.LEFT_SHOULDER, label: "어깨" },
  { index: LM.RIGHT_SHOULDER, label: "어깨" },
  { index: LM.LEFT_ELBOW, label: "팔꿈치" },
  { index: LM.RIGHT_ELBOW, label: "팔꿈치" },
  { index: LM.LEFT_WRIST, label: "손목" },
  { index: LM.RIGHT_WRIST, label: "손목" },
  { index: LM.LEFT_HIP, label: "골반" },
  { index: LM.RIGHT_HIP, label: "골반" },
  { index: LM.LEFT_KNEE, label: "무릎" },
  { index: LM.RIGHT_KNEE, label: "무릎" },
  { index: LM.LEFT_ANKLE, label: "발목" },
  { index: LM.RIGHT_ANKLE, label: "발목" },
];

/** 전신 측정에 반드시 필요한 랜드마크 */
export const REQUIRED_FOR_FULL_BODY: ReadonlyArray<number> = [
  LM.NOSE,
  LM.LEFT_SHOULDER,
  LM.RIGHT_SHOULDER,
  LM.LEFT_HIP,
  LM.RIGHT_HIP,
  LM.LEFT_KNEE,
  LM.RIGHT_KNEE,
  LM.LEFT_ANKLE,
  LM.RIGHT_ANKLE,
];

export const LANDMARK_NAMES_KO: Record<number, string> = {
  [LM.NOSE]: "코",
  [LM.LEFT_SHOULDER]: "왼쪽 어깨",
  [LM.RIGHT_SHOULDER]: "오른쪽 어깨",
  [LM.LEFT_ELBOW]: "왼쪽 팔꿈치",
  [LM.RIGHT_ELBOW]: "오른쪽 팔꿈치",
  [LM.LEFT_WRIST]: "왼쪽 손목",
  [LM.RIGHT_WRIST]: "오른쪽 손목",
  [LM.LEFT_HIP]: "왼쪽 골반",
  [LM.RIGHT_HIP]: "오른쪽 골반",
  [LM.LEFT_KNEE]: "왼쪽 무릎",
  [LM.RIGHT_KNEE]: "오른쪽 무릎",
  [LM.LEFT_ANKLE]: "왼쪽 발목",
  [LM.RIGHT_ANKLE]: "오른쪽 발목",
};

/** 픽셀 좌표 점 */
export interface Pt {
  x: number;
  y: number;
}

/** 정규화 좌표를 이미지 픽셀 좌표로 변환 (가로/세로 스케일이 다르므로 비율 계산 전 필수) */
export function toPx(lm: PoseLandmark, width: number, height: number): Pt {
  return { x: lm.x * width, y: lm.y * height };
}

export function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 좌우 반전된 이미지의 랜드마크로 변환 (x → 1 - x, 좌/우 인덱스는 그대로 사람 기준) */
export function mirrorLandmarks(landmarks: PoseLandmark[]): PoseLandmark[] {
  return landmarks.map((l) => ({ ...l, x: 1 - l.x }));
}
