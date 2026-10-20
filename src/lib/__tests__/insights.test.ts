import { describe, expect, it } from "vitest";
import { computeFrontFeatures } from "../analysis/features";
import { bandOf, buildInsights } from "../analysis/insights";
import { syntheticMask, syntheticPose } from "./fixtures";
import { LM } from "../pose/landmarks";

const W = 720;
const H = 1280;

function frontWithMask() {
  const pose = syntheticPose();
  pose[LM.LEFT_ELBOW].x = 0.8;
  pose[LM.RIGHT_ELBOW].x = 0.2;
  pose[LM.LEFT_WRIST].x = 0.82;
  pose[LM.RIGHT_WRIST].x = 0.18;
  const mask = syntheticMask(180, 320, (y) => (y < 0.08 || y > 0.92 ? 0 : y < 0.3 ? 0.13 : y < 0.44 ? 0.1 : 0.125));
  return { pose, features: computeFrontFeatures(pose, W, H, mask) };
}

describe("body insights", () => {
  it("측정 항목은 실제 계산된 값과 구간, 위치를 가짐", () => {
    const { pose, features } = frontWithMask();
    const list = buildInsights({ frontLandmarks: pose, front: features, side: null, answers: [] });
    const measured = list.filter((i) => i.measured);
    expect(measured.map((i) => i.part).sort()).toEqual(["balance", "proportion", "shoulder", "waist", "weight"].sort());
    for (const m of measured) {
      expect(typeof m.value).toBe("number");
      expect(m.bandLabel).toMatch(/참고 구간/);
      expect(m.anchor).not.toBeNull();
      expect(m.styling.length).toBeGreaterThan(10);
    }
  });

  it("측정하지 않는 부위는 값 없이 자가 체크 응답만", () => {
    const { pose, features } = frontWithMask();
    const list = buildInsights({
      frontLandmarks: pose,
      front: features,
      side: null,
      answers: [{ questionId: "collarbone", optionId: "prominent" }, { questionId: "wrist", optionId: "unknown" }],
    });
    const unmeasured = list.filter((i) => !i.measured);
    expect(unmeasured.map((i) => i.part)).toEqual(["collarbone", "chest", "wrist", "knee"]);
    for (const u of unmeasured) {
      expect(u.value).toBeUndefined();
      expect(u.band).toBeUndefined();
      expect(u.observation).toContain("측정하지 않는");
    }
    expect(unmeasured[0].selfAnswer).toBe("크고 뚜렷하게 보이는 편");
    expect(unmeasured[0].styling).toContain("오픈 칼라");
    expect(unmeasured[2].selfAnswer).toBe("잘 모르겠어요");
    expect(unmeasured[3].selfAnswer).toBe("아직 체크하지 않았어요");
  });

  it("사진이 없으면 측정 항목 없이 자가 체크 항목만, 위치 없음", () => {
    const list = buildInsights({ frontLandmarks: null, front: null, side: null, answers: [] });
    expect(list.every((i) => !i.measured && i.anchor === null)).toBe(true);
  });

  it("구간 판단은 판정 규칙 임계값을 그대로 사용", () => {
    expect(bandOf("torsoLegRatio", 0.5)).toBe("low");
    expect(bandOf("torsoLegRatio", 0.6)).toBe("neutral");
    expect(bandOf("torsoLegRatio", 0.7)).toBe("high");
  });
});
