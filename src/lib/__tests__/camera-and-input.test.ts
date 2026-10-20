import { describe, expect, it } from "vitest";
import { buildClassifierInput } from "../analysis/buildInput";
import type { PhotoAnalysis } from "../analysis/analyzePhoto";
import { computeFrontFeatures } from "../analysis/features";
import { checkCameraEnvironment, mapCameraError } from "../camera/errors";
import { TASKS_VISION_VERSION } from "../pose/landmarker";
import { assessQuality } from "../pose/quality";
import { syntheticPose } from "./fixtures";
import pkg from "../../../node_modules/@mediapipe/tasks-vision/package.json";

describe("camera errors", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "notFound"],
    ["NotReadableError", "inUse"],
    ["OverconstrainedError", "overconstrained"],
    ["AbortError", "aborted"],
    ["Weird", "unknown"],
  ])("%s → %s", (name, code) => {
    const info = mapCameraError({ name });
    expect(info.code).toBe(code);
    expect(info.message.length).toBeGreaterThan(5);
  });

  it("권한 거부 안내는 한국어 + 업로드 대안 포함", () => {
    expect(mapCameraError({ name: "NotAllowedError" }).message).toContain("사진 업로드");
  });

  it("HTTP·미지원 환경 점검", () => {
    expect(checkCameraEnvironment({ isSecureContext: false, hasMediaDevices: true })?.code).toBe("insecure");
    expect(checkCameraEnvironment({ isSecureContext: true, hasMediaDevices: false })?.code).toBe("unsupported");
    expect(checkCameraEnvironment({ isSecureContext: true, hasMediaDevices: true })).toBeNull();
  });
});

describe("MediaPipe 버전", () => {
  it("WASM CDN 폴백 버전이 설치된 패키지와 일치", () => {
    expect(TASKS_VISION_VERSION).toBe(pkg.version);
  });
});

function analysis(view: "front" | "side", status: PhotoAnalysis["status"]): PhotoAnalysis {
  const pose = syntheticPose();
  const quality = assessQuality({ poses: [pose], view, imageWidth: 720, imageHeight: 1280, luminance: { mean: 130, std: 50 } });
  return {
    view,
    status,
    quality,
    landmarks: pose,
    features: status === "ok" ? computeFrontFeatures(pose, 720, 1280) : null,
    imageWidth: 720,
    imageHeight: 1280,
    outlineDataUrl: null,
    delegate: "CPU",
    modelVariant: "full",
    analyzedAt: "2026-01-01T00:00:00Z",
  };
}

describe("buildClassifierInput", () => {
  it("성공한 정면 분석의 특징만 사용", () => {
    const input = buildClassifierInput({ front: analysis("front", "ok"), answers: [], fittedClothing: false });
    expect(input.quality.frontAnalyzed).toBe(true);
    expect(input.quality.frontLevel).toBe("good");
    expect(input.visualFeatures.length).toBe(3);
  });

  it("거부된 사진은 특징 없이 품질 none 처리 (가짜 값 생성 안 함)", () => {
    const input = buildClassifierInput({ front: analysis("front", "rejected"), answers: [], fittedClothing: true });
    expect(input.visualFeatures).toEqual([]);
    expect(input.quality.frontAnalyzed).toBe(false);
    expect(input.quality.frontLevel).toBe("none");
    expect(input.quality.fittedClothing).toBe(true);
  });
});
