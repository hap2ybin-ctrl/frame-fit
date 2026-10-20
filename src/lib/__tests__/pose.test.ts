import { describe, expect, it } from "vitest";
import { computeFrontFeatures, computeSideFeatures } from "../analysis/features";
import { LM, mirrorLandmarks } from "../pose/landmarks";
import { maskLooksValid, maskToOutlineRGBA, rowRunAt } from "../pose/mask";
import { allChecksPassed, assessQuality, checkProgress, computeLuminance } from "../pose/quality";
import { LandmarkSmoother, OneEuroFilter, StabilityTracker } from "../pose/smoothing";
import { syntheticMask, syntheticPose } from "./fixtures";

const W = 720;
const H = 1280;
const goodLight = { mean: 130, std: 50 };

describe("assessQuality", () => {
  it("사람이 없으면 측정 불가", () => {
    const r = assessQuality({ poses: [], view: "front", imageWidth: W, imageHeight: H });
    expect(r.canMeasure).toBe(false);
    expect(r.checks[0]).toMatchObject({ id: "person", status: "fail" });
    expect(r.primaryMessage).toContain("감지되지 않았어요");
  });

  it("두 명 이상이면 측정 불가", () => {
    const r = assessQuality({ poses: [syntheticPose(), syntheticPose({ centerX: 0.3 })], view: "front", imageWidth: W, imageHeight: H });
    expect(r.canMeasure).toBe(false);
    expect(r.primaryMessage).toContain("두 명 이상");
  });

  it("정상 정면 전신은 측정 가능", () => {
    const r = assessQuality({ poses: [syntheticPose()], view: "front", imageWidth: W, imageHeight: H, luminance: goodLight });
    expect(r.canMeasure).toBe(true);
    expect(r.level).toBe("good");
  });

  it("발목이 화면 밖이면 실패", () => {
    const r = assessQuality({ poses: [syntheticPose({ ankleY: 1.02, kneeY: 0.85 })], view: "front", imageWidth: W, imageHeight: H });
    expect(r.canMeasure).toBe(false);
    expect(r.checks.find((c) => c.id === "inFrame")?.message).toContain("발목");
  });

  it("관절 가시성이 낮으면 실패", () => {
    const r = assessQuality({ poses: [syntheticPose({ visibility: 0.2 })], view: "front", imageWidth: W, imageHeight: H });
    expect(r.checks.find((c) => c.id === "visibility")?.status).toBe("fail");
  });

  it("너무 작은 인물은 실패", () => {
    const r = assessQuality({
      poses: [syntheticPose({ noseY: 0.5, shoulderY: 0.55, hipY: 0.62, kneeY: 0.68, ankleY: 0.75, shoulderHalf: 0.03, hipHalf: 0.02 })],
      view: "front",
      imageWidth: W,
      imageHeight: H,
    });
    expect(r.checks.find((c) => c.id === "size")?.status).toBe("fail");
  });

  it("측면 촬영에서 정면 자세면 경고", () => {
    const r = assessQuality({ poses: [syntheticPose()], view: "side", imageWidth: W, imageHeight: H });
    expect(r.checks.find((c) => c.id === "pose")?.status).toBe("warn");
  });

  it("측면 자세(어깨 폭이 좁게 투영)면 통과", () => {
    const r = assessQuality({ poses: [syntheticPose({ shoulderHalf: 0.02, hipHalf: 0.015 })], view: "side", imageWidth: W, imageHeight: H });
    expect(r.checks.find((c) => c.id === "pose")?.status).toBe("pass");
  });

  it("어두우면 조명 실패, 흔들리면 측정 중단", () => {
    const dark = assessQuality({ poses: [syntheticPose()], view: "front", imageWidth: W, imageHeight: H, luminance: { mean: 20, std: 10 } });
    expect(dark.checks.find((c) => c.id === "lighting")?.status).toBe("fail");
    const shaky = assessQuality({ poses: [syntheticPose()], view: "front", imageWidth: W, imageHeight: H, jitter: 0.08 });
    expect(shaky.canMeasure).toBe(false);
    expect(shaky.checks.find((c) => c.id === "stability")?.status).toBe("fail");
  });

  it("휘도 계산", () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const s = computeLuminance(px, 1);
    expect(s.mean).toBeCloseTo(127.5, 0);
    expect(s.std).toBeCloseTo(127.5, 0);
  });
});

describe("자동 촬영 조건", () => {
  const base = { view: "front" as const, imageWidth: W, imageHeight: H, luminance: goodLight };

  it("모든 확인사항(흔들림 포함)이 통과하면 자동 촬영 가능", () => {
    const r = assessQuality({ ...base, poses: [syntheticPose()], jitter: 0.005 });
    expect(allChecksPassed(r)).toBe(true);
    expect(checkProgress(r)).toEqual({ passed: 8, total: 8 });
  });

  it("주의 항목이 하나라도 있으면 자동 촬영하지 않음 (수동 촬영은 가능)", () => {
    const r = assessQuality({ ...base, poses: [syntheticPose({ centerX: 0.2 })], jitter: 0.005 });
    expect(r.canMeasure).toBe(true);
    expect(allChecksPassed(r)).toBe(false);
    expect(checkProgress(r).passed).toBe(7);
  });

  it("흔들림 확인 전(null)이면 대기", () => {
    expect(allChecksPassed(assessQuality({ ...base, poses: [syntheticPose()], jitter: null }))).toBe(false);
  });

  it("건너뛴 항목은 통과 수 계산에서 제외", () => {
    const r = assessQuality({ ...base, poses: [syntheticPose()] }); // 사진 모드: 흔들림 skip
    expect(checkProgress(r).total).toBe(7);
    expect(allChecksPassed(r)).toBe(true);
  });

  it("사람이 없으면 자동 촬영 불가", () => {
    expect(allChecksPassed(assessQuality({ ...base, poses: [] }))).toBe(false);
  });
});

describe("features", () => {
  it("정면 비율을 픽셀 좌표 기준으로 계산", () => {
    const f = computeFrontFeatures(syntheticPose(), W, H);
    const byId = Object.fromEntries(f.features.map((x) => [x.id, x.value]));
    // 어깨 0.32*720=230.4px, 골반 0.22*720=158.4px
    expect(byId.shoulderHipRatio).toBeCloseTo(230.4 / 158.4, 2);
    // 몸통 0.26*1280=332.8, 다리 0.4*1280=512
    expect(byId.torsoLegRatio).toBeCloseTo(332.8 / 512, 2);
    expect(byId.shoulderTorsoRatio).toBeCloseTo(230.4 / 332.8, 2);
    expect(f.notes.join(" ")).toContain("마스크");
  });

  it("좌우 반전(미러링)해도 비율이 같다", () => {
    const pose = syntheticPose({ centerX: 0.45 });
    const a = computeFrontFeatures(pose, W, H).features;
    const b = computeFrontFeatures(mirrorLandmarks(pose), W, H).features;
    expect(b.map((x) => x.value)).toEqual(a.map((x) => x.value));
    // 사람 기준 좌/우 인덱스는 유지된다
    expect(mirrorLandmarks(pose)[LM.LEFT_SHOULDER].x).toBeCloseTo(1 - pose[LM.LEFT_SHOULDER].x);
  });

  it("마스크 기반 허리/엉덩이 윤곽 비율", () => {
    const pose = syntheticPose();
    // 팔이 몸통에서 떨어지도록 손목·팔꿈치를 바깥으로
    pose[LM.LEFT_ELBOW].x = 0.8;
    pose[LM.RIGHT_ELBOW].x = 0.2;
    pose[LM.LEFT_WRIST].x = 0.82;
    pose[LM.RIGHT_WRIST].x = 0.18;
    const mask = syntheticMask(180, 320, (y) => {
      if (y < 0.08 || y > 0.92) return 0;
      if (y < 0.3) return 0.13; // 어깨
      if (y < 0.44) return 0.1; // 허리
      return 0.125; // 엉덩이
    });
    const f = computeFrontFeatures(pose, W, H, mask);
    const waistHip = f.features.find((x) => x.id === "silhouetteWaistHipRatio");
    expect(waistHip).toBeDefined();
    expect(waistHip!.value).toBeCloseTo(0.2 / 0.25, 1);
    expect(waistHip!.clothingSensitive).toBe(true);
  });

  it("팔이 몸통에 붙어 있으면 허리 윤곽을 측정하지 않음", () => {
    const pose = syntheticPose();
    const mask = syntheticMask(180, 320, (y) => (y > 0.08 && y < 0.92 ? 0.25 : 0));
    const f = computeFrontFeatures(pose, W, H, mask);
    expect(f.features.find((x) => x.id === "silhouetteWaistHipRatio")).toBeUndefined();
    expect(f.notes.join(" ")).toContain("팔이 몸통");
  });

  it("측면 윤곽 깊이 + 옷 두께 경고", () => {
    const pose = syntheticPose({ shoulderHalf: 0.02, hipHalf: 0.015 });
    const mask = syntheticMask(180, 320, (y) => (y > 0.08 && y < 0.92 ? 0.1 : 0));
    const f = computeSideFeatures(pose, W, H, mask);
    const depth = f.features.find((x) => x.id === "sideUpperDepthRatio");
    expect(depth).toBeDefined();
    // 폭 0.2*720=144px, 몸통 0.26*1280=332.8px
    expect(depth!.value).toBeCloseTo(144 / 332.8, 1);
    expect(f.notes[0]).toContain("구분할 수 없어요");
  });
});

describe("mask", () => {
  it("기준점을 포함하는 구간만 선택 (팔 분리)", () => {
    const data = new Float32Array(20);
    // 한 행: [팔][빈칸][몸통][빈칸][팔]
    [1, 2, 6, 7, 8, 9, 10, 11, 12, 13, 17, 18].forEach((x) => (data[x] = 1));
    const run = rowRunAt({ data, width: 20, height: 1 }, 0, 0.5);
    expect(run).not.toBeNull();
    expect(run!.left).toBeCloseTo(6 / 20);
    expect(run!.right).toBeCloseTo(14 / 20);
  });

  it("GPU 읽기 실패로 0만 있는 마스크는 무효 처리", () => {
    expect(maskLooksValid(new Float32Array(1000))).toBe(false);
    expect(maskLooksValid(syntheticMask(40, 40, (y) => (y > 0.2 && y < 0.8 ? 0.2 : 0)).data)).toBe(true);
  });

  it("윤곽선 RGBA 생성", () => {
    const m = syntheticMask(20, 20, (y) => (y > 0.2 && y < 0.8 ? 0.3 : 0));
    const out = maskToOutlineRGBA(m, [255, 0, 0]);
    expect(out.width).toBe(20);
    const alphas = new Set<number>();
    for (let i = 3; i < out.data.length; i += 4) alphas.add(out.data[i]);
    expect(alphas.has(235)).toBe(true); // 경계
    expect(alphas.has(28)).toBe(true); // 내부
  });
});

describe("smoothing", () => {
  it("One Euro Filter는 노이즈를 줄인다", () => {
    const f = new OneEuroFilter();
    let maxDev = 0;
    for (let i = 0; i < 60; i++) {
      const noisy = 0.5 + (i % 2 ? 0.01 : -0.01);
      const y = f.filter(noisy, i * 33);
      if (i > 10) maxDev = Math.max(maxDev, Math.abs(y - 0.5));
    }
    expect(maxDev).toBeLessThan(0.01);
  });

  it("LandmarkSmoother는 33개 좌표를 유지", () => {
    const s = new LandmarkSmoother();
    const out = s.smooth(syntheticPose(), 0);
    expect(out).toHaveLength(33);
  });

  it("StabilityTracker: 정지 vs 흔들림", () => {
    const still = new StabilityTracker();
    for (let i = 0; i < 8; i++) still.push(syntheticPose());
    expect(still.jitter(W / H)).toBeCloseTo(0, 5);
    const shaky = new StabilityTracker();
    for (let i = 0; i < 8; i++) shaky.push(syntheticPose({ centerX: 0.5 + (i % 2 ? 0.03 : -0.03) }));
    expect(shaky.jitter(W / H)!).toBeGreaterThan(0.035);
  });
});
