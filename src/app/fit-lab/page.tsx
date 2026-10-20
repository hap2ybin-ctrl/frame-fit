import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/flow/StepNav";
import { FitLabView } from "./FitLabView";

export const metadata: Metadata = { title: "실루엣 비교" };

export default function FitLabPage() {
  return (
    <>
      <PageHeader
        eyebrow="FIT LAB"
        title="슬림·레귤러·오버핏 실루엣 비교"
        description="상의 길이, 허리선, 하의 형태를 바꾸면서 핏에 따라 실루엣이 어떻게 달라지는지 비교해 보세요."
      />
      <Suspense fallback={<div className="mx-auto h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />}>
        <FitLabView />
      </Suspense>
    </>
  );
}
