import type { Metadata } from "next";
import { StepNav } from "@/components/flow/StepNav";
import { ResultView } from "./ResultView";

export const metadata: Metadata = { title: "결과" };

export default function ResultPage() {
  return (
    <>
      <StepNav />
      <ResultView />
    </>
  );
}
