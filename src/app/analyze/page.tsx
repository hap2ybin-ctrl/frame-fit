import type { Metadata } from "next";
import { PageHeader, StepNav } from "@/components/flow/StepNav";
import { AnalyzeView } from "./AnalyzeView";

export const metadata: Metadata = { title: "분석" };

export default function AnalyzePage() {
  return (
    <>
      <StepNav />
      <PageHeader
        eyebrow="STEP 03 · ANALYSIS"
        title="사진에서 관찰 가능한 비율"
        description="포즈 모델이 실제로 감지한 관절 좌표와 인체 윤곽만 사용해요. 모든 값은 무단위 비율이며 cm 같은 실제 치수는 계산하지 않아요."
      />
      <AnalyzeView />
    </>
  );
}
