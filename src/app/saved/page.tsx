import type { Metadata } from "next";
import { PageHeader } from "@/components/flow/StepNav";
import { SavedView } from "./SavedView";

export const metadata: Metadata = { title: "내 결과" };

export default function SavedPage() {
  return (
    <>
      <PageHeader
        eyebrow="MY RESULTS"
        title="검사 기록과 데이터 관리"
        description="검사를 마칠 때마다 결과 요약과 관절 좌표·측정값이 이 브라우저에만 기록돼요. 사진은 켠 경우에만 남고, 영상은 기록하지 않아요."
      />
      <SavedView />
    </>
  );
}
