export type CameraErrorCode =
  | "insecure"
  | "unsupported"
  | "denied"
  | "notFound"
  | "inUse"
  | "overconstrained"
  | "aborted"
  | "unknown";

export interface CameraErrorInfo {
  code: CameraErrorCode;
  title: string;
  message: string;
  /** 같은 버튼으로 다시 시도할 만한 오류인지 */
  retryable: boolean;
}

const INFO: Record<CameraErrorCode, Omit<CameraErrorInfo, "code">> = {
  insecure: {
    title: "보안 연결이 필요해요",
    message: "카메라는 HTTPS 또는 localhost에서만 사용할 수 있어요. 주소를 확인하거나 사진 업로드를 이용해 주세요.",
    retryable: false,
  },
  unsupported: {
    title: "카메라를 지원하지 않는 환경이에요",
    message: "이 브라우저에서는 카메라를 사용할 수 없어요. 최신 Chrome·Safari를 사용하거나 사진 업로드를 이용해 주세요.",
    retryable: false,
  },
  denied: {
    title: "카메라 권한이 거부되었어요",
    message:
      "브라우저 주소창의 카메라 아이콘 또는 설정에서 이 사이트의 카메라 권한을 허용한 뒤 다시 시도해 주세요. 카카오톡·인스타그램 등 앱 안의 브라우저나 미리보기 창에서는 카메라가 차단될 수 있으니 Chrome 또는 Safari로 열어 주세요. 사진 업로드로도 진행할 수 있어요.",
    retryable: true,
  },
  notFound: {
    title: "카메라를 찾을 수 없어요",
    message: "연결된 카메라가 없어요. 카메라를 연결하거나 사진 업로드를 이용해 주세요.",
    retryable: true,
  },
  inUse: {
    title: "카메라를 사용할 수 없어요",
    message: "다른 앱이나 탭에서 카메라를 사용 중일 수 있어요. 해당 앱을 종료한 뒤 다시 시도해 주세요.",
    retryable: true,
  },
  overconstrained: {
    title: "요청한 카메라 설정을 지원하지 않아요",
    message: "다른 카메라로 전환하거나 다시 시도해 주세요.",
    retryable: true,
  },
  aborted: {
    title: "카메라 시작이 중단되었어요",
    message: "다시 시도해 주세요.",
    retryable: true,
  },
  unknown: {
    title: "카메라를 시작하지 못했어요",
    message: "잠시 후 다시 시도하거나 사진 업로드를 이용해 주세요.",
    retryable: true,
  },
};

export function cameraErrorInfo(code: CameraErrorCode): CameraErrorInfo {
  return { code, ...INFO[code] };
}

/** getUserMedia 예외(DOMException 등)를 사용자 안내로 변환 */
export function mapCameraError(err: unknown): CameraErrorInfo {
  const name = typeof err === "object" && err && "name" in err ? String((err as { name: unknown }).name) : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return cameraErrorInfo("denied");
    case "NotFoundError":
    case "DevicesNotFoundError":
      return cameraErrorInfo("notFound");
    case "NotReadableError":
    case "TrackStartError":
      return cameraErrorInfo("inUse");
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return cameraErrorInfo("overconstrained");
    case "AbortError":
      return cameraErrorInfo("aborted");
    default:
      return cameraErrorInfo("unknown");
  }
}

/** 카메라 사용 전 환경 점검 */
export function checkCameraEnvironment(env: { isSecureContext: boolean; hasMediaDevices: boolean }): CameraErrorInfo | null {
  if (!env.isSecureContext) return cameraErrorInfo("insecure");
  if (!env.hasMediaDevices) return cameraErrorInfo("unsupported");
  return null;
}
