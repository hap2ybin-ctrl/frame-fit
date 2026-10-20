import type { Metadata } from "next";
import { PageHeader, StepNav } from "@/components/flow/StepNav";
import { CheckView } from "./CheckView";

export const metadata: Metadata = { title: "보완 체크" };

export default function CheckPage() {
  return (
    <>
      <StepNav />
      <PageHeader
        eyebrow="STEP 04 · SELF CHECK"
        title="사진으로 알 수 없는 특징을 직접 체크해요"
        description="거울을 보거나 손으로 만져 보며 가장 가까운 느낌을 골라 주세요. 정답은 없어요. 확실하지 않으면 '잘 모르겠어요'를 선택하면 점수에 반영하지 않아요."
      />
      <CheckView />
    </>
  );
}
