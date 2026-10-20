import { LM, type PoseLandmark } from "../pose/landmarks";
import type { MaskData } from "../pose/mask";

/**
 * 테스트용 합성 포즈. 실제 인물 데이터가 아니라 기하 계산 검증용 좌표입니다.
 * 이미지 정규화 좌표(0~1), 정면 기준.
 */
export interface SyntheticPoseOptions {
  centerX?: number;
  noseY?: number;
  shoulderY?: number;
  hipY?: number;
  kneeY?: number;
  ankleY?: number;
  shoulderHalf?: number; // 정규화 x
  hipHalf?: number;
  visibility?: number;
  /** 사람 기준 왼쪽이 이미지 오른쪽에 오는 정면(비반전) 이미지 */
  facingCamera?: boolean;
}

export function syntheticPose(o: SyntheticPoseOptions = {}): PoseLandmark[] {
  const cx = o.centerX ?? 0.5;
  const noseY = o.noseY ?? 0.12;
  const sY = o.shoulderY ?? 0.24;
  const hY = o.hipY ?? 0.5;
  const kY = o.kneeY ?? 0.7;
  const aY = o.ankleY ?? 0.9;
  const sh = o.shoulderHalf ?? 0.16;
  const hh = o.hipHalf ?? 0.11;
  const v = o.visibility ?? 0.95;
  // 정면 촬영(비반전): 사람의 왼쪽은 이미지 오른쪽(+x)
  const s = o.facingCamera === false ? -1 : 1;
  const pts: PoseLandmark[] = Array.from({ length: 33 }, () => ({ x: cx, y: noseY, z: 0, visibility: v }));
  const set = (i: number, x: number, y: number) => {
    pts[i] = { x, y, z: 0, visibility: v };
  };
  set(LM.NOSE, cx, noseY);
  for (const i of [1, 2, 3, 7, 9]) set(i, cx + s * 0.02, noseY - 0.01);
  for (const i of [4, 5, 6, 8, 10]) set(i, cx - s * 0.02, noseY - 0.01);
  set(LM.LEFT_SHOULDER, cx + s * sh, sY);
  set(LM.RIGHT_SHOULDER, cx - s * sh, sY);
  set(LM.LEFT_ELBOW, cx + s * (sh + 0.06), sY + 0.13);
  set(LM.RIGHT_ELBOW, cx - s * (sh + 0.06), sY + 0.13);
  set(LM.LEFT_WRIST, cx + s * (sh + 0.08), hY - 0.02);
  set(LM.RIGHT_WRIST, cx - s * (sh + 0.08), hY - 0.02);
  for (const i of [17, 19, 21]) set(i, cx + s * (sh + 0.08), hY + 0.01);
  for (const i of [18, 20, 22]) set(i, cx - s * (sh + 0.08), hY + 0.01);
  set(LM.LEFT_HIP, cx + s * hh, hY);
  set(LM.RIGHT_HIP, cx - s * hh, hY);
  set(LM.LEFT_KNEE, cx + s * hh, kY);
  set(LM.RIGHT_KNEE, cx - s * hh, kY);
  set(LM.LEFT_ANKLE, cx + s * hh, aY);
  set(LM.RIGHT_ANKLE, cx - s * hh, aY);
  set(LM.LEFT_HEEL, cx + s * hh, aY + 0.01);
  set(LM.RIGHT_HEEL, cx - s * hh, aY + 0.01);
  set(LM.LEFT_FOOT_INDEX, cx + s * (hh + 0.02), aY + 0.02);
  set(LM.RIGHT_FOOT_INDEX, cx - s * (hh + 0.02), aY + 0.02);
  return pts;
}

/**
 * 합성 마스크: 행마다 [center - halfWidth(y), center + halfWidth(y)] 구간을 1로 채움
 */
export function syntheticMask(width: number, height: number, halfWidthAt: (yNorm: number) => number, center = 0.5): MaskData {
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const half = halfWidthAt(y / (height - 1));
    if (half <= 0) continue;
    const l = Math.round((center - half) * width);
    const r = Math.round((center + half) * width);
    for (let x = Math.max(0, l); x < Math.min(width, r); x++) data[y * width + x] = 1;
  }
  return { data, width, height };
}
