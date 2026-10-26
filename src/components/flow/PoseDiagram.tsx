import { cn } from "@/lib/utils";

const SRC = {
  front: "/brand/guide-front.webp",
  side: "/brand/guide-side.webp",
} as const;

/**
 * 정면/측면 자세 예시 — AI로 만든 얼굴 없는 인체 이미지(실제 인물 아님)에
 * 머리끝·발끝 프레이밍 가이드선을 겹쳐 보여 줍니다.
 */
export function PoseDiagram({ view, className }: { view: "front" | "side"; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-[#F3F2EF] ring-1 ring-black/5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 배포(GitHub Pages)에서 이미지 최적화 서버를 쓰지 않음 */}
      <img
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${SRC[view]}`}
        alt={view === "front" ? "정면 자세 예시: 정면을 보고 팔을 몸에서 살짝 띄운 채 곧게 선 모습" : "측면 자세 예시: 옆으로 서서 팔을 몸 옆에 자연스럽게 내린 모습"}
        width={480}
        height={720}
        loading="lazy"
        className="block h-auto w-full"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-3 top-[5%] border-t border-dashed border-ink/30" />
      <div aria-hidden className="pointer-events-none absolute inset-x-3 bottom-[8%] border-t border-dashed border-ink/30" />
    </div>
  );
}
