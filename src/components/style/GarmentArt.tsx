import { GARMENT_IMAGES, garmentImageSrc } from "@/lib/styling/garmentImages.data";
import type { Garment } from "@/lib/styling/types";
import { cn } from "@/lib/utils";

/** 이미지가 없을 때: 그림 대신 아이템 색상 칩만 보여 주는 중립 타일 */
export function GarmentPlaceholder({ garment, className }: { garment: Garment; className?: string }) {
  return (
    <div className={cn("grid place-items-center bg-surface", className)} role="img" aria-label={`${garment.name} (이미지 준비 중)`}>
      <span aria-hidden className="size-1/3 max-h-8 max-w-8 rounded-full ring-1 ring-black/10" style={{ background: garment.color }} />
    </div>
  );
}

/**
 * 의복 이미지: AI 생성 상품컷(또는 라이선스 사진). 이미지가 없으면 색상 칩 타일.
 */
export function GarmentVisual({ garment, className, sizes }: { garment: Garment; className?: string; sizes?: string }) {
  const src = garmentImageSrc(garment.id);
  if (!src) return <GarmentPlaceholder garment={garment} className={className} />;
  const kind = GARMENT_IMAGES[garment.id]?.kind;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 배포(GitHub Pages)에서 이미지 최적화 서버를 쓰지 않음
    <img
      src={src}
      alt={`${garment.name} ${kind === "ai" ? "AI 생성 이미지" : "사진"}`}
      loading="lazy"
      decoding="async"
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
