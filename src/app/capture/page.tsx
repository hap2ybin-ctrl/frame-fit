import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader, StepNav } from "@/components/flow/StepNav";
import { CaptureView } from "./CaptureView";

export const metadata: Metadata = { title: "촬영" };

export default function CapturePage() {
  return (
    <>
      <StepNav />
      <PageHeader
        eyebrow="STEP 02 · CAPTURE"
        title="정면과 측면을 촬영해 주세요"
        description="정면 사진은 필수, 측면 사진은 선택이에요. 카메라 대신 사진을 업로드해도 같은 방식으로 분석해요."
      />
      <Suspense fallback={<div className="mx-auto h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />}>
        <CaptureView />
      </Suspense>
    </>
  );
}
