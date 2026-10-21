import { garmentCutoutSrc } from "@/lib/styling/garmentImages.data";
import { modelCutSrc } from "@/lib/styling/modelCuts";
import type { Garment, Outfit, Slot, StyleLine } from "@/lib/styling/types";
import { cn } from "@/lib/utils";
import { GarmentIcon } from "./GarmentArt";

/** 플랫레이 보드 위 슬롯별 배치 (%, 보드 기준). 겹쳐 놓아 스타일링 북 느낌을 냄 */
const BOX: Record<Slot, { l: number; t: number; w: number; h: number; z: number }> = {
  outer: { l: 44, t: 2, w: 54, h: 52, z: 1 },
  top: { l: 3, t: 3, w: 56, h: 42, z: 3 },
  dress: { l: 4, t: 2, w: 58, h: 80, z: 3 },
  bottom: { l: 30, t: 36, w: 44, h: 60, z: 2 },
  shoes: { l: 2, t: 68, w: 34, h: 24, z: 4 },
  accessory: { l: 64, t: 70, w: 33, h: 24, z: 4 },
};

function Cutout({ garment }: { garment: Garment }) {
  const b = BOX[garment.slot];
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
export function FlatLayBoard({ garments, className, label }: { garments: Garment[]; className?: string; label: string }) {
  // 원피스가 있으면 상의·하의 자리는 쓰지 않음
  const hasDress = garments.some((g) => g.slot === "dress");
  const shown = garments.filter((g) => !(hasDress && (g.slot === "top" || g.slot === "bottom")));
  return (
    <div role="img" aria-label={label} className={cn("relative overflow-hidden rounded-2xl bg-[#EFE9DF]", className)}>
      {shown.map((g) => (
        <Cutout key={g.id} garment={g} />
      ))}
    </div>
  );
}

/**
 * 스타일링 북 스프레드: 왼쪽 모델컷 + 오른쪽 누끼 플랫레이.
 * 모델컷이 없는 조합이면 플랫레이만 넓게 보여 줌.
 */
export function LookSpread({ outfit, line, index }: { outfit: Outfit; line: StyleLine | null; index: number }) {
  const garments = outfit.items.map((i) => i.garment);
  const model = modelCutSrc(outfit, line, index);
  return (
    <div>
      <div className={cn("grid h-72 gap-2 sm:h-80", model ? "grid-cols-[1fr_1.15fr]" : "grid-cols-1")}>
        {model && (
          <figure className="relative overflow-hidden rounded-2xl bg-[#EFECE6]">
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 배포에서 이미지 최적화 서버를 쓰지 않음 */}
            <img
              src={model.src}
              alt={`AI 생성 ${model.gender === "women" ? "여성" : "남성"} 모델이 ${outfit.concept} 조합을 입은 모습`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top"
            />
            <figcaption className="absolute bottom-2 left-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
              AI 모델
            </figcaption>
          </figure>
        )}
        <FlatLayBoard garments={garments} className="h-full" label={`${outfit.concept} 코디 플랫레이`} />
      </div>
      <p className="mt-2 px-1 text-[11px] leading-snug text-neutral-500">
        AI 생성 이미지 · 실제 판매 상품이 아니에요
        {model && " · 모델컷은 상의·하의 조합 참고용이며 특정 체형을 대표하지 않아요"}
      </p>
    </div>
  );
}
