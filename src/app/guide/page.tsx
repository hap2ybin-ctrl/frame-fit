import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ClipboardCheck, Lightbulb, Ruler, Shirt, Smartphone, Upload, Users } from "lucide-react";
import { PoseDiagram } from "@/components/flow/PoseDiagram";
import { Notice } from "@/components/flow/Notice";
import { PageHeader, StepNav } from "@/components/flow/StepNav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "촬영 안내" };

const CHECKS = [
  {
    icon: Lightbulb,
    title: "카메라 환경",
    items: ["얼굴 정면 쪽에서 빛이 들어오는 밝은 곳", "역광(창문 등지기)은 피하기", "단색 벽처럼 단순한 배경", "주변에 다른 사람이 나오지 않게"],
  },
  {
    icon: Smartphone,
    title: "전신 프레이밍",
    items: ["카메라에서 2~3m 떨어지기", "카메라는 허리 높이에 세워 두기", "머리 위와 발 아래에 여백 남기기", "세로 화면 권장"],
  },
  {
    icon: Shirt,
    title: "옷차림",
    items: ["몸선이 드러나는 얇은 옷 (레깅스·얇은 니트 등)", "두꺼운 아우터·오버핏은 벗기", "긴 머리는 묶어 어깨선이 보이게", "옷 두께는 측정에서 구분할 수 없어요"],
  },
  {
    icon: Ruler,
    title: "자세",
    items: ["정면: 발을 어깨너비로, 팔은 몸에서 살짝 떨어뜨리기", "측면: 몸을 90도 돌려 옆모습", "턱을 당기고 체중을 양발에 고르게", "촬영 중에는 2~3초 정지"],
  },
];

export default function GuidePage() {
  return (
    <>
      <StepNav />
      <PageHeader
        eyebrow="STEP 01 · GUIDE"
        title="정확한 측정을 위한 촬영 준비"
        description="촬영 조건에 따라 측정값이 크게 달라져요. 아래 조건을 확인한 뒤 정면 1장, 측면 1장을 준비해 주세요. 측면은 선택 사항이에요."
      />
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHECKS.map((c) => (
            <section key={c.title} className="rounded-3xl p-6 ring-1 ring-black/5">
              <div className="flex items-center gap-2">
                <c.icon className="size-5" aria-hidden />
                <h2 className="text-lg font-semibold">{c.title}</h2>
              </div>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-700">
                {c.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                    {it}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <PoseDiagram view="front" className="w-full" />
              <figcaption className="mt-2 text-center text-xs text-neutral-500">정면</figcaption>
            </figure>
            <figure>
              <PoseDiagram view="side" className="w-full" />
              <figcaption className="mt-2 text-center text-xs text-neutral-500">측면 (선택)</figcaption>
            </figure>
          </div>
          <Notice tone="warn" title="다른 사람을 촬영한다면">
            <span className="flex items-start gap-1">
              <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              촬영 대상에게 목적을 설명하고 동의를 먼저 받아 주세요. 동의 없이 타인의 신체를 촬영·분석하지 마세요.
            </span>
          </Notice>
          <Notice tone="info" title="데이터는 기기 안에서만">
            카메라 영상과 사진은 브라우저 안에서 분석되며 서버로 전송되지 않아요. 분석 엔진과 모델 파일만 내려받아요.
          </Notice>
        </aside>
      </div>
      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-3 px-5 sm:flex-row sm:px-8">
        <Link href="/capture" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base")}>
          <Camera className="size-4" aria-hidden /> 카메라로 촬영
        </Link>
        <Link href="/capture?mode=upload" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 rounded-full px-6 text-base")}>
          <Upload className="size-4" aria-hidden /> 사진 업로드
        </Link>
        <Link href="/check" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-12 rounded-full px-6 text-base text-neutral-600")}>
          <ClipboardCheck className="size-4" aria-hidden /> 사진 없이 자가 체크만 하기
        </Link>
      </div>
    </>
  );
}
