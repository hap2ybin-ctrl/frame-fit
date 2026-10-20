import { LM, REQUIRED_FOR_FULL_BODY, type PoseLandmark } from "./landmarks";

export type CaptureView = "front" | "side";
export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export interface QualityCheck {
  id: "person" | "visibility" | "inFrame" | "size" | "centered" | "pose" | "lighting" | "stability";
  label: string;
  status: CheckStatus;
  message: string;
}

export interface QualityReport {
  level: "good" | "fair" | "poor";
  /** fail 항목이 하나도 없을 때만 측정/촬영 가능 */
  canMeasure: boolean;
  checks: QualityCheck[];
  /** 사용자에게 가장 먼저 보여줄 안내 */
  primaryMessage: string;
}

export interface LuminanceStats {
  mean: number; // 0~255
  std: number;
}

export interface QualityInput {
  poses: PoseLandmark[][];
  view: CaptureView;
  imageWidth: number;
  imageHeight: number;
  luminance?: LuminanceStats | null;
  /** 실시간 모드에서만: 몸통 길이 대비 프레임 간 평균 이동량 */
  jitter?: number | null;
}

/**
 * 촬영 품질 임계값.
 * 실험적으로 정한 초기값이며, 다양한 환경에서 검증된 값이 아닙니다.
 */
export const QUALITY_THRESHOLDS = {
  visibilityFail: 0.35,
  visibilityWarn: 0.6,
  frameMargin: 0.01,
  headRoom: 0.02,
  minBodySpanFail: 0.3,
  minBodySpanWarn: 0.45,
  maxBodySpanWarn: 0.94,
  centerMin: 0.25,
  centerMax: 0.75,
  shoulderTiltWarnDeg: 6,
  torsoLeanWarnDeg: 10,
  frontFacingMinRatio: 0.45, // 어깨폭 / 몸통길이: 이보다 작으면 몸이 돌아간 상태
  sideFacingMaxRatio: 0.42, // 측면 촬영에서 이보다 크면 정면에 가까움
  darkFail: 40,
  darkWarn: 65,
  brightWarn: 225,
  lowContrastWarn: 22,
  jitterWarn: 0.018,
  jitterFail: 0.035,
} as const;

const T = QUALITY_THRESHOLDS;

const PART_NAMES: Record<number, string> = {
  [LM.NOSE]: "머리",
  [LM.LEFT_SHOULDER]: "어깨",
  [LM.RIGHT_SHOULDER]: "어깨",
  [LM.LEFT_HIP]: "골반",
  [LM.RIGHT_HIP]: "골반",
  [LM.LEFT_KNEE]: "무릎",
  [LM.RIGHT_KNEE]: "무릎",
  [LM.LEFT_ANKLE]: "발목",
  [LM.RIGHT_ANKLE]: "발목",
};

/** 측면 촬영에서는 한쪽 관절이 가려지므로 좌/우 중 잘 보이는 쪽을 사용 */
const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  [LM.LEFT_HIP, LM.RIGHT_HIP],
  [LM.LEFT_KNEE, LM.RIGHT_KNEE],
  [LM.LEFT_ANKLE, LM.RIGHT_ANKLE],
];

function vis(l: PoseLandmark | undefined): number {
  return l?.visibility ?? 0;
}

function angleDeg(dx: number, dy: number): number {
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function assessQuality(input: QualityInput): QualityReport {
  const checks: QualityCheck[] = [];
  const { poses, view, imageWidth: W, imageHeight: H } = input;

  // 1) 인원 수
  if (poses.length === 0) {
    checks.push({ id: "person", label: "인물 감지", status: "fail", message: "사람이 감지되지 않았어요. 전신이 보이도록 화면 안에 들어와 주세요." });
    return finalize(checks);
  }
  if (poses.length > 1) {
    checks.push({ id: "person", label: "인물 감지", status: "fail", message: "두 명 이상이 감지되었어요. 한 명만 화면에 나오도록 촬영해 주세요." });
    return finalize(checks);
  }
  checks.push({ id: "person", label: "인물 감지", status: "pass", message: "한 명이 감지되었어요." });

  const l = poses[0];
  if (l.length < 33) {
    checks.push({ id: "visibility", label: "관절 인식", status: "fail", message: "관절 정보가 충분하지 않아요. 다시 촬영해 주세요." });
    return finalize(checks);
  }

  // 2) 가시성
  const required: number[] =
    view === "front"
      ? [...REQUIRED_FOR_FULL_BODY]
      : [LM.NOSE, ...PAIRS.map(([a, b]) => (vis(l[a]) >= vis(l[b]) ? a : b))];
  const lowFail = required.filter((i) => vis(l[i]) < T.visibilityFail);
  const lowWarn = required.filter((i) => vis(l[i]) < T.visibilityWarn);
  if (lowFail.length) {
    checks.push({
      id: "visibility",
      label: "관절 인식",
      status: "fail",
      message: `${uniqueParts(lowFail)} 부위가 잘 보이지 않아요. 가려진 곳이 없는지 확인해 주세요.`,
    });
  } else if (lowWarn.length) {
    checks.push({
      id: "visibility",
      label: "관절 인식",
      status: "warn",
      message: `${uniqueParts(lowWarn)} 인식이 다소 불안정해요. 몸에 붙는 옷이나 밝은 조명이 도움이 돼요.`,
    });
  } else {
    checks.push({ id: "visibility", label: "관절 인식", status: "pass", message: "주요 관절이 잘 보여요." });
  }

  // 3) 전신 포함
  const cut: string[] = [];
  for (const i of required) {
    const p = l[i];
    if (p.x < T.frameMargin || p.x > 1 - T.frameMargin || p.y > 1 - T.frameMargin) cut.push(PART_NAMES[i] ?? "신체");
  }
  if (l[LM.NOSE].y < T.headRoom) cut.push("머리");
  if (cut.length) {
    checks.push({
      id: "inFrame",
      label: "전신 프레이밍",
      status: "fail",
      message: `${[...new Set(cut)].join(", ")}이(가) 화면 밖으로 나갔어요. 머리부터 발끝까지 들어오게 해 주세요.`,
    });
  } else {
    checks.push({ id: "inFrame", label: "전신 프레이밍", status: "pass", message: "머리부터 발목까지 화면 안에 있어요." });
  }

  // 4) 화면 내 크기
  const ankleY = Math.max(l[LM.LEFT_ANKLE].y, l[LM.RIGHT_ANKLE].y);
  const span = ankleY - l[LM.NOSE].y;
  if (span < T.minBodySpanFail) {
    checks.push({ id: "size", label: "인물 크기", status: "fail", message: "인물이 너무 작게 보여요. 카메라에 조금 더 가까이 와 주세요." });
  } else if (span < T.minBodySpanWarn) {
    checks.push({ id: "size", label: "인물 크기", status: "warn", message: "조금 더 가까이 오면 측정이 안정적이에요." });
  } else if (span > T.maxBodySpanWarn) {
    checks.push({ id: "size", label: "인물 크기", status: "warn", message: "화면에 꽉 차 있어요. 한 걸음 뒤로 물러나 주세요." });
  } else {
    checks.push({ id: "size", label: "인물 크기", status: "pass", message: "화면 속 크기가 적절해요." });
  }

  // 5) 중앙 정렬
  const hipMidX = (l[LM.LEFT_HIP].x + l[LM.RIGHT_HIP].x) / 2;
  if (hipMidX < T.centerMin || hipMidX > T.centerMax) {
    checks.push({ id: "centered", label: "위치", status: "warn", message: "화면 가운데로 이동해 주세요." });
  } else {
    checks.push({ id: "centered", label: "위치", status: "pass", message: "화면 중앙에 서 있어요." });
  }

  // 6) 자세 (픽셀 좌표 기준)
  checks.push(poseCheck(l, view, W, H));

  // 7) 조명
  if (input.luminance) {
    const { mean, std } = input.luminance;
    if (mean < T.darkFail) {
      checks.push({ id: "lighting", label: "조명", status: "fail", message: "너무 어두워요. 조명을 켜거나 밝은 곳으로 이동해 주세요." });
    } else if (mean < T.darkWarn) {
      checks.push({ id: "lighting", label: "조명", status: "warn", message: "조금 어두워요. 정면에서 빛이 들어오면 좋아요." });
    } else if (mean > T.brightWarn) {
      checks.push({ id: "lighting", label: "조명", status: "warn", message: "빛이 너무 강해요. 역광이나 직사광을 피해 주세요." });
    } else if (std < T.lowContrastWarn) {
      checks.push({ id: "lighting", label: "조명", status: "warn", message: "배경과 옷의 대비가 낮아요. 단색 배경 앞에서 촬영하면 윤곽이 또렷해져요." });
    } else {
      checks.push({ id: "lighting", label: "조명", status: "pass", message: "밝기가 적절해요." });
    }
  } else {
    checks.push({ id: "lighting", label: "조명", status: "skip", message: "밝기를 확인하지 못했어요." });
  }

  // 8) 흔들림 (실시간 모드에서만)
  if (input.jitter === undefined) {
    checks.push({ id: "stability", label: "안정성", status: "skip", message: "사진 모드에서는 확인하지 않아요." });
  } else if (input.jitter === null) {
    checks.push({ id: "stability", label: "안정성", status: "warn", message: "안정성을 확인하는 중이에요. 잠시 멈춰 주세요." });
  } else if (input.jitter > T.jitterFail) {
    checks.push({ id: "stability", label: "안정성", status: "fail", message: "움직임이 커서 측정을 잠시 멈췄어요. 자세를 고정해 주세요." });
  } else if (input.jitter > T.jitterWarn) {
    checks.push({ id: "stability", label: "안정성", status: "warn", message: "조금 흔들리고 있어요. 자세를 유지해 주세요." });
  } else {
    checks.push({ id: "stability", label: "안정성", status: "pass", message: "자세가 안정적이에요." });
  }

  return finalize(checks);
}

function poseCheck(l: PoseLandmark[], view: CaptureView, W: number, H: number): QualityCheck {
  const ls = { x: l[LM.LEFT_SHOULDER].x * W, y: l[LM.LEFT_SHOULDER].y * H };
  const rs = { x: l[LM.RIGHT_SHOULDER].x * W, y: l[LM.RIGHT_SHOULDER].y * H };
  const lh = { x: l[LM.LEFT_HIP].x * W, y: l[LM.LEFT_HIP].y * H };
  const rh = { x: l[LM.RIGHT_HIP].x * W, y: l[LM.RIGHT_HIP].y * H };
  const sm = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hm = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  const torso = Math.hypot(sm.x - hm.x, sm.y - hm.y);
  const shoulderW = Math.hypot(ls.x - rs.x, ls.y - rs.y);
  if (torso < 1) {
    return { id: "pose", label: "자세", status: "fail", message: "몸통을 인식하지 못했어요." };
  }
  const lean = Math.abs(angleDeg(hm.y - sm.y, hm.x - sm.x)); // 수직 대비 기울기
  if (lean > T.torsoLeanWarnDeg) {
    return { id: "pose", label: "자세", status: "warn", message: "몸이 기울어져 있어요. 똑바로 서 주세요." };
  }
  const ratio = shoulderW / torso;
  if (view === "front") {
    const tilt = Math.abs(angleDeg(Math.abs(ls.x - rs.x), ls.y - rs.y));
    if (ratio < T.frontFacingMinRatio) {
      return { id: "pose", label: "자세", status: "warn", message: "몸이 돌아가 있어요. 카메라를 정면으로 바라봐 주세요." };
    }
    if (tilt > T.shoulderTiltWarnDeg) {
      return { id: "pose", label: "자세", status: "warn", message: "어깨가 한쪽으로 기울어져 있어요. 양발에 체중을 고르게 실어 주세요." };
    }
    return { id: "pose", label: "자세", status: "pass", message: "정면 자세가 좋아요." };
  }
  if (ratio > T.sideFacingMaxRatio) {
    return { id: "pose", label: "자세", status: "warn", message: "몸을 옆으로 90도 돌려 측면이 보이게 서 주세요." };
  }
  return { id: "pose", label: "자세", status: "pass", message: "측면 자세가 좋아요." };
}

function uniqueParts(indices: number[]): string {
  return [...new Set(indices.map((i) => PART_NAMES[i] ?? "신체"))].join(", ");
}

function finalize(checks: QualityCheck[]): QualityReport {
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  const level: QualityReport["level"] = fails.length ? "poor" : warns.length >= 2 ? "fair" : warns.length === 1 ? "fair" : "good";
  const primary = fails[0] ?? warns[0];
  return {
    level,
    canMeasure: fails.length === 0,
    checks,
    primaryMessage: primary ? primary.message : "촬영 준비가 되었어요.",
  };
}

/** RGBA 픽셀 배열에서 휘도 평균/표준편차 계산 (Rec. 601) */
export function computeLuminance(data: Uint8ClampedArray | Uint8Array, step = 4): LuminanceStats {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let i = 0; i + 2 < data.length; i += 4 * step) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += y;
    sumSq += y * y;
    n++;
  }
  if (!n) return { mean: 0, std: 0 };
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(sumSq / n - mean * mean, 0)) };
}
