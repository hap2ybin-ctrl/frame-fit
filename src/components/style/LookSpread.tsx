import { garmentCutoutSrc } from "@/lib/styling/garmentImages.data";
import { flatLayLayout, type BoardShape, type Box } from "@/lib/styling/flatLayLayout";
import { TYPE_META } from "@/lib/brand/typeMeta";
import type { Garment, Outfit } from "@/lib/styling/types";
import { cn } from "@/lib/utils";
import { GarmentIcon } from "./GarmentArt";

function Cutout({ garment, box: b }: { garment: Garment; box: Box }) {
  const src = garmentCutoutSrc(garment.id);
  const style = { left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, zIndex: b.z };
  return (
    <div className="absolute" style={style}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- 정적 배포에서 이미지 최적화 서버를 쓰지 않음
        <img
          src={src}
          alt={garment.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(60,45,30,0.18)]"
        />
      ) : (
        <GarmentIcon garment={garment} className="h-full w-full" />
      )}
    </div>
  );
}

/** 누끼 아이템을 종이 질감 배경 위에 배치한 플랫레이 */
export function FlatLayBoard({
  garments,
  className,
  label,
  shape = "wide",
}: {
  garments: Garment[];
  className?: string;
  label: string;
  shape?: BoardShape;
}) {
  // 원피스가 있으면 상의·하의 자리는 쓰지 않음
  const hasDress = garments.some((g) => g.slot === "dress");
  const shown = garments.filter((g) => !(hasDress && (g.slot === "top" || g.slot === "bottom")));
  const layout = flatLayLayout(
    shown.map((g) => g.slot),
    shape,
  );
  return (
    <div role="img" aria-label={label} className={cn("relative overflow-hidden rounded-2xl bg-[#EFE9DF]", className)}>
      {shown.map((g) => {
        const box = layout[g.slot];
        return box ? <Cutout key={g.id} garment={g} box={box} /> : null;
      })}
    </div>
  );
}

/**
 * 스타일링 북 스프레드: 왼쪽 모델컷(체형별 AI 모델이 제안 아이템 전부를 입은 모습) + 오른쪽 누끼 플랫레이.
 * 완성 룩이 아닌 코디(옷장 조합 등)는 플랫레이만 넓게 보여 줌.
 */
export function LookSpread({ outfit }: { outfit: Outfit }) {
  const garments = outfit.items.map((i) => i.garment);
  const look = outfit.look;
  const src = look ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/looks/${look.image}.webp` : null;
  const bodyLabel = look && look.bodyType !== "neutral" ? `${TYPE_META[look.bodyType].label} 경향` : "유형 기준 없음";
  return (
    <div>
      <div className={cn("grid h-72 gap-2 sm:h-80", src ? "grid-cols-[1fr_1.15fr]" : "grid-cols-1")}>
        {src && look && (
          <figure className="relative overflow-hidden rounded-2xl bg-[#EFECE6]">
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 배포에서 이미지 최적화 서버를 쓰지 않음 */}
            <img
              src={src}
              alt={`${bodyLabel} 체형의 AI ${look.gender === "women" ? "여성" : "남성"} 모델이 ${outfit.concept} 코디를 입은 모습`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top"
            />
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
              AI 모델 · {bodyLabel}
            </figcaption>
          </figure>
        )}
        <FlatLayBoard garments={garments} shape={src ? "tall" : "wide"} className="h-full" label={`${outfit.concept} 코디 플랫레이`} />
      </div>
      <p className="mt-2 px-1 text-[11px] leading-snug text-neutral-500">
        AI 생성 이미지 · 실제 판매 상품이 아니에요
        {src && " · 모델 체형은 유형 경향을 보여 주는 예시이며 실제 개인과 다를 수 있어요"}
      </p>
    </div>
  );
}
