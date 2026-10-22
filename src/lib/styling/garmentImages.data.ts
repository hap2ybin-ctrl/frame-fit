/**
 * 의복 이미지 목록 — public/garments/<id>.jpg (640×640)
 * 모든 이미지는 OpenAI 이미지 모델(gpt-image-2)로 생성한 상품컷 스타일 이미지이며, 실제 판매 상품이 아닙니다.
 * 사람·브랜드 로고·텍스트가 없는지 확인한 뒤 사용했습니다.
 * 누끼(배경 제거)본은 public/garments/cutout/<id>.webp 에 있습니다.
 * 목록에 없는 아이템은 자체 제작 SVG 일러스트로 표시합니다.
 */
export interface GarmentImage {
  file: string;
  /** ai: AI 생성 이미지 / photo: 라이선스 사진 (현재 없음, 추후 쇼핑 연동 등에 대비) */
  kind: "ai" | "photo";
  credit?: { author: string; url: string; source: string };
}

export const GARMENT_IMAGES: Record<string, GarmentImage> = {
  "shirt-oxford": { file: "garments/shirt-oxford.jpg", kind: "ai" },
  "shirt-linen-over": { file: "garments/shirt-linen-over.jpg", kind: "ai" },
  "tee-crew": { file: "garments/tee-crew.jpg", kind: "ai" },
  "tee-boxy": { file: "garments/tee-boxy.jpg", kind: "ai" },
  "knit-vneck": { file: "garments/knit-vneck.jpg", kind: "ai" },
  "knit-crop": { file: "garments/knit-crop.jpg", kind: "ai" },
  "knit-cable": { file: "garments/knit-cable.jpg", kind: "ai" },
  "blouse-soft": { file: "garments/blouse-soft.jpg", kind: "ai" },
  "turtleneck": { file: "garments/turtleneck.jpg", kind: "ai" },
  "polo-knit": { file: "garments/polo-knit.jpg", kind: "ai" },
  "jacket-tailored": { file: "garments/jacket-tailored.jpg", kind: "ai" },
  "jacket-short": { file: "garments/jacket-short.jpg", kind: "ai" },
  "jacket-oversized": { file: "garments/jacket-oversized.jpg", kind: "ai" },
  "coat-long": { file: "garments/coat-long.jpg", kind: "ai" },
  "trench": { file: "garments/trench.jpg", kind: "ai" },
  "cardigan-short": { file: "garments/cardigan-short.jpg", kind: "ai" },
  "blouson": { file: "garments/blouson.jpg", kind: "ai" },
  "slacks-straight": { file: "garments/slacks-straight.jpg", kind: "ai" },
  "jeans-straight": { file: "garments/jeans-straight.jpg", kind: "ai" },
  "pants-wide": { file: "garments/pants-wide.jpg", kind: "ai" },
  "pants-tapered": { file: "garments/pants-tapered.jpg", kind: "ai" },
  "chino-relaxed": { file: "garments/chino-relaxed.jpg", kind: "ai" },
  "skirt-pencil": { file: "garments/skirt-pencil.jpg", kind: "ai" },
  "skirt-flare": { file: "garments/skirt-flare.jpg", kind: "ai" },
  "skirt-long": { file: "garments/skirt-long.jpg", kind: "ai" },
  "dress-wrap": { file: "garments/dress-wrap.jpg", kind: "ai" },
  "dress-shirt": { file: "garments/dress-shirt.jpg", kind: "ai" },
  "dress-maxi": { file: "garments/dress-maxi.jpg", kind: "ai" },
  "loafer": { file: "garments/loafer.jpg", kind: "ai" },
  "sneaker": { file: "garments/sneaker.jpg", kind: "ai" },
  "pumps": { file: "garments/pumps.jpg", kind: "ai" },
  "boots": { file: "garments/boots.jpg", kind: "ai" },
  "derby": { file: "garments/derby.jpg", kind: "ai" },
  "belt-thin": { file: "garments/belt-thin.jpg", kind: "ai" },
  "bag-structured": { file: "garments/bag-structured.jpg", kind: "ai" },
  "scarf-large": { file: "garments/scarf-large.jpg", kind: "ai" },
  // 확장분
  "tee-stripe": { file: "garments/tee-stripe.jpg", kind: "ai" },
  "sweatshirt": { file: "garments/sweatshirt.jpg", kind: "ai" },
  "shirt-denim": { file: "garments/shirt-denim.jpg", kind: "ai" },
  "shirt-stripe": { file: "garments/shirt-stripe.jpg", kind: "ai" },
  "knit-gray": { file: "garments/knit-gray.jpg", kind: "ai" },
  "henley": { file: "garments/henley.jpg", kind: "ai" },
  "blouse-satin": { file: "garments/blouse-satin.jpg", kind: "ai" },
  "blouse-puff": { file: "garments/blouse-puff.jpg", kind: "ai" },
  "hoodie": { file: "garments/hoodie.jpg", kind: "ai" },
  "turtleneck-ivory": { file: "garments/turtleneck-ivory.jpg", kind: "ai" },
  "tee-long": { file: "garments/tee-long.jpg", kind: "ai" },
  "knit-sleeveless": { file: "garments/knit-sleeveless.jpg", kind: "ai" },
  "slacks-beige": { file: "garments/slacks-beige.jpg", kind: "ai" },
  "jeans-wide": { file: "garments/jeans-wide.jpg", kind: "ai" },
  "jeans-black": { file: "garments/jeans-black.jpg", kind: "ai" },
  "cargo-pants": { file: "garments/cargo-pants.jpg", kind: "ai" },
  "shorts-bermuda": { file: "garments/shorts-bermuda.jpg", kind: "ai" },
  "skirt-denim": { file: "garments/skirt-denim.jpg", kind: "ai" },
  "skirt-mini": { file: "garments/skirt-mini.jpg", kind: "ai" },
  "skirt-slip": { file: "garments/skirt-slip.jpg", kind: "ai" },
  "jogger": { file: "garments/jogger.jpg", kind: "ai" },
  "pants-linen": { file: "garments/pants-linen.jpg", kind: "ai" },
  "dress-knit": { file: "garments/dress-knit.jpg", kind: "ai" },
  "dress-sleeveless": { file: "garments/dress-sleeveless.jpg", kind: "ai" },
  "dress-slip": { file: "garments/dress-slip.jpg", kind: "ai" },
  "jacket-denim": { file: "garments/jacket-denim.jpg", kind: "ai" },
  "jacket-leather": { file: "garments/jacket-leather.jpg", kind: "ai" },
  "padding-short": { file: "garments/padding-short.jpg", kind: "ai" },
  "coat-black": { file: "garments/coat-black.jpg", kind: "ai" },
  "cardigan-long": { file: "garments/cardigan-long.jpg", kind: "ai" },
  "jacket-suede": { file: "garments/jacket-suede.jpg", kind: "ai" },
  "jacket-shirt": { file: "garments/jacket-shirt.jpg", kind: "ai" },
  "blazer-beige": { file: "garments/blazer-beige.jpg", kind: "ai" },
  "coat-wrap": { file: "garments/coat-wrap.jpg", kind: "ai" },
  "mules": { file: "garments/mules.jpg", kind: "ai" },
  "flats": { file: "garments/flats.jpg", kind: "ai" },
  "chelsea": { file: "garments/chelsea.jpg", kind: "ai" },
  "sandals": { file: "garments/sandals.jpg", kind: "ai" },
  "sneaker-retro": { file: "garments/sneaker-retro.jpg", kind: "ai" },
  "loafer-black": { file: "garments/loafer-black.jpg", kind: "ai" },
  "slingback": { file: "garments/slingback.jpg", kind: "ai" },
  "bag-tote": { file: "garments/bag-tote.jpg", kind: "ai" },
  "bag-cross": { file: "garments/bag-cross.jpg", kind: "ai" },
  "cap": { file: "garments/cap.jpg", kind: "ai" },
  "bag-shoulder": { file: "garments/bag-shoulder.jpg", kind: "ai" },
  "scarf-silk": { file: "garments/scarf-silk.jpg", kind: "ai" },
  "belt-wide": { file: "garments/belt-wide.jpg", kind: "ai" },
};

/** AI 생성에 사용한 도구 (출처 표기용) */
export const AI_IMAGE_SOURCE = "OpenAI gpt-image-2";

/** 배경을 제거한 누끼 이미지 (public/garments/cutout/<id>.webp, 투명 배경) */
export function garmentCutoutSrc(id: string): string | null {
  return GARMENT_IMAGES[id] ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/garments/cutout/${id}.webp` : null;
}

export function garmentImageSrc(id: string): string | null {
  const img = GARMENT_IMAGES[id];
  return img ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/${img.file}` : null;
}
