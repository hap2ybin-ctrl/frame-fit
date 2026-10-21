import { GARMENT_IMAGES, garmentImageSrc } from "@/lib/styling/garmentImages.data";
import type { Garment, GarmentShape } from "@/lib/styling/types";
import { cn } from "@/lib/utils";

/**
 * 자체 제작 의복 실루엣 SVG (100×100 좌표계). 실제 상품 이미지가 아닌 카테고리 일러스트입니다.
 */
const SHAPES: Record<GarmentShape, { d: string; detail?: string }> = {
  shirt: {
    d: "M32 10 L42 6 L50 14 L58 6 L68 10 L92 26 L84 44 L74 38 L74 94 L26 94 L26 38 L16 44 L8 26 Z",
    detail: "M42 6 L46 20 L50 14 L54 20 L58 6 M50 14 V94",
  },
  tee: { d: "M34 10 Q50 20 66 10 L92 24 L84 40 L72 34 L72 92 L28 92 L28 34 L16 40 L8 24 Z" },
  knit: {
    d: "M34 10 Q50 19 66 10 L90 22 L96 82 L84 84 L74 42 L74 92 L26 92 L26 42 L16 84 L4 82 L10 22 Z",
    detail: "M26 86 H74 M4 78 L16 80 M84 80 L96 78",
  },
  "knit-crop": {
    d: "M34 14 Q50 22 66 14 L88 24 L94 78 L82 80 L74 42 L74 70 L26 70 L26 42 L18 80 L6 78 L12 24 Z",
    detail: "M26 64 H74",
  },
  blouse: {
    d: "M34 10 Q50 18 66 10 L90 24 L86 50 L74 46 L78 92 Q50 98 22 92 L26 46 L14 50 L10 24 Z",
    detail: "M44 16 Q50 26 56 16 M50 22 L44 34 M50 22 L56 34",
  },
  turtleneck: {
    d: "M38 2 H62 V12 L90 22 L96 82 L84 84 L74 42 L74 92 L26 92 L26 42 L16 84 L4 82 L10 22 L38 12 Z",
    detail: "M38 8 H62",
  },
  polo: {
    d: "M34 10 L42 6 L50 16 L58 6 L66 10 L92 24 L84 40 L72 34 L72 92 L28 92 L28 34 L16 40 L8 24 Z",
    detail: "M42 6 L46 18 L50 16 L54 18 L58 6 M50 16 V34",
  },
  jacket: {
    d: "M32 8 L50 42 L68 8 L90 20 L96 88 L84 90 L76 44 L76 96 L24 96 L24 44 L16 90 L4 88 L10 20 Z",
    detail: "M32 8 L40 30 L36 34 L50 56 M68 8 L60 30 L64 34 L50 56 V96 M30 70 H40",
  },
  "jacket-short": {
    d: "M34 10 L50 36 L66 10 L88 20 L94 80 L82 82 L76 42 L76 72 L24 72 L24 42 L18 82 L6 80 L12 20 Z",
    detail: "M50 36 V72 M46 46 H54 M46 58 H54",
  },
  "jacket-oversized": {
    d: "M28 6 L50 44 L72 6 L96 22 L98 92 L84 94 L80 46 L82 98 L18 98 L20 46 L16 94 L2 92 L4 22 Z",
    detail: "M28 6 L38 32 L34 36 L50 60 M72 6 L62 32 L66 36 L50 60 V98",
  },
  coat: {
    d: "M34 4 L50 34 L66 4 L86 14 L92 70 L82 72 L78 40 L80 99 L20 99 L22 40 L18 72 L8 70 L14 14 Z",
    detail: "M34 4 L42 24 L38 28 L50 48 M66 4 L58 24 L62 28 L50 48 V99",
  },
  trench: {
    d: "M34 4 L50 30 L66 4 L86 14 L92 70 L82 72 L78 40 L82 99 L18 99 L22 40 L18 72 L8 70 L14 14 Z",
    detail: "M22 52 H78 M44 48 H56 V56 H44 Z M50 30 V99",
  },
  cardigan: {
    d: "M34 12 L50 44 L66 12 L88 22 L94 80 L82 82 L74 42 L74 72 L26 72 L26 42 L18 82 L6 80 L12 22 Z",
    detail: "M50 44 V72 M26 66 H74",
  },
  blouson: {
    d: "M36 8 H64 L90 20 L94 80 L82 82 L76 42 L76 74 L24 74 L24 42 L18 82 L6 80 L10 20 Z",
    detail: "M50 8 V74 M24 68 H76",
  },
  "pants-straight": { d: "M28 4 H72 L74 98 H56 L50 30 L44 98 H26 Z", detail: "M28 10 H72 M50 10 V30" },
  "pants-wide": { d: "M26 4 H74 L88 98 H56 L50 30 L44 98 H12 Z", detail: "M26 10 H74 M50 10 V30" },
  "pants-tapered": { d: "M26 2 H74 L68 98 H55 L50 30 L45 98 H32 Z", detail: "M26 10 H74 M40 10 L42 20 M60 10 L58 20" },
  "skirt-pencil": { d: "M30 8 H70 L73 82 H27 Z", detail: "M30 14 H70 M50 70 V82" },
  "skirt-flare": { d: "M34 8 H66 L92 84 Q50 96 8 84 Z", detail: "M34 14 H66 M42 20 L30 86 M58 20 L70 86" },
  "skirt-long": { d: "M34 2 H66 L82 99 H18 Z", detail: "M34 8 H66 M42 8 L34 99 M50 8 V99 M58 8 L66 99" },
  "dress-wrap": {
    d: "M34 4 L50 30 L66 4 L80 12 L74 28 L66 40 L86 98 H14 L34 40 L26 28 L20 12 Z",
    detail: "M34 40 H66 M66 40 L74 56 M66 40 L78 50",
  },
  "dress-shirt": {
    d: "M34 4 L42 2 L50 10 L58 2 L66 4 L88 18 L82 34 L72 30 L76 98 H24 L28 30 L18 34 L12 18 Z",
    detail: "M50 10 V60 M28 42 H72",
  },
  "dress-maxi": { d: "M36 4 Q50 12 64 4 L70 30 L66 40 L84 99 H16 L34 40 L30 30 Z", detail: "M34 40 H66" },
  loafer: { d: "M8 64 Q10 46 30 46 L62 48 Q84 50 92 62 L92 72 H8 Z", detail: "M8 66 H92 M44 50 Q52 58 64 52" },
  sneaker: { d: "M8 62 Q10 42 32 44 L54 48 Q80 50 92 62 L92 74 H8 Z", detail: "M8 66 H92 M40 48 L46 58 M48 48 L54 58" },
  heel: { d: "M10 68 L16 50 Q30 44 50 54 L94 66 L92 72 L30 70 L26 88 L20 88 L22 70 Z" },
  boots: { d: "M30 8 H58 L60 54 Q86 56 92 70 V84 H26 Z", detail: "M26 78 H92 M58 14 H30" },
  derby: { d: "M8 64 Q10 44 32 44 L60 48 Q84 50 92 62 L92 72 H8 Z", detail: "M8 66 H92 M38 46 L48 56 M44 46 L54 56 M50 46 L60 56" },
  belt: { d: "M4 42 H96 V58 H4 Z", detail: "M58 38 H74 V62 H58 Z M66 50 H82" },
  bag: { d: "M18 38 H82 L88 88 H12 Z", detail: "M34 38 Q34 14 50 14 Q66 14 66 38 M12 56 H88" },
  scarf: { d: "M10 30 Q30 18 50 30 T90 30 L90 46 Q70 34 50 46 T10 46 Z", detail: "M70 40 L74 90 L84 90 L82 44" },
};

export function GarmentShapeSvg({ shape, color, x = 0, y = 0, size = 100 }: { shape: GarmentShape; color: string; x?: number; y?: number; size?: number }) {
  const s = SHAPES[shape];
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 100})`}>
      <path d={s.d} fill={color} stroke="#121316" strokeOpacity="0.22" strokeWidth="1.4" strokeLinejoin="round" />
      {s.detail && <path d={s.detail} fill="none" stroke="#121316" strokeOpacity="0.28" strokeWidth="1.2" strokeLinecap="round" />}
    </g>
  );
}

export function GarmentIcon({ garment, className }: { garment: Garment; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${garment.name} 일러스트`}>
      <GarmentShapeSvg shape={garment.shape} color={garment.color} />
    </svg>
  );
}

/**
 * 의복 이미지: 사진(AI 생성 또는 라이선스 사진)이 있으면 사진, 없으면 SVG 일러스트.
 */
export function GarmentVisual({ garment, className, sizes }: { garment: Garment; className?: string; sizes?: string }) {
  const src = garmentImageSrc(garment.id);
  if (!src) return <GarmentIcon garment={garment} className={className} />;
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
