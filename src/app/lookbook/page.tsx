import type { Metadata } from "next";
import { PageHeader } from "@/components/flow/StepNav";
import { LookbookView } from "./LookbookView";

export const metadata: Metadata = { title: "코디북" };

export default function LookbookPage() {
  return (
    <>
      <PageHeader
        eyebrow="LOOKBOOK"
        title="코디북과 취향 기록"
        description="저장한 코디, 제외한 코디, 선호하는 핏과 스타일을 모아 보고 관리해요. 사진과 분석 좌표는 여기에 저장되지 않아요."
      />
      <LookbookView />
    </>
  );
}
