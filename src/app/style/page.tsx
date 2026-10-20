import type { Metadata } from "next";
import { PageHeader, StepNav } from "@/components/flow/StepNav";
import { StyleView } from "./StyleView";

export const metadata: Metadata = { title: "맞춤 코디" };

export default function StylePage() {
  return (
    <>
      <StepNav />
      <PageHeader
        eyebrow="STEP 06 · STYLING"
        title="나에게 맞춘 코디 제안"
        description="유형 경향에 원하는 실루엣, 상황, 취향, 가진 옷을 더해 조합해요. 정해진 정답이나 금지 의상은 없어요. 각 아이템의 이유와 대안을 함께 확인해 보세요."
      />
      <StyleView />
    </>
  );
}
