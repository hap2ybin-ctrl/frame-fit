import type { Metadata } from "next";
import { PageHeader } from "@/components/flow/StepNav";
import { SavedView } from "./SavedView";

export const metadata: Metadata = { title: "내 결과" };

export default function SavedPage() {
  return (
    <>
      <PageHeader
        eyebrow="MY RESULTS"
        title="저장된 결과와 데이터 관리"
        description="동의하고 저장한 결과 요약은 이 브라우저에만 있어요. 사진·영상·관절 좌표는 저장하지 않아요."
      />
      <SavedView />
    </>
  );
}
