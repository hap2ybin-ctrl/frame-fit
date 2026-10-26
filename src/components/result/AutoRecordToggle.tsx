"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setRecordSettings, useRecordSettings } from "@/lib/store/saved";
import { cn } from "@/lib/utils";

/** 검사 기록 설정: 자동 기록 / 사진도 함께 기록 (결과 화면·내 결과에서 공용) */
export function AutoRecordToggle({ className }: { className?: string }) {
  const { auto, photos } = useRecordSettings();
  return (
    <div className={cn("space-y-3", className)}>
      <Label className="items-start justify-between gap-4 font-normal leading-relaxed">
        <span className="text-sm">
          검사 후 자동 기록
          <span className="block text-xs text-neutral-500">
            {auto ? "검사를 마칠 때마다 결과 요약과 관절 좌표·측정값이 이 브라우저에 남아요." : "꺼져 있어요. 원하는 결과만 직접 기록할 수 있어요."}
          </span>
        </span>
        <Switch checked={auto} onCheckedChange={(v) => setRecordSettings({ auto: v })} className="mt-1" aria-label="검사 후 자동 기록" />
      </Label>
      <Label className="items-start justify-between gap-4 font-normal leading-relaxed">
        <span className="text-sm">
          사진도 함께 기록
          <span className="block text-xs text-neutral-500">
            {photos
              ? "촬영 사진을 줄여서 이 기기에만 보관해요. 기기를 함께 쓰는 사람이 볼 수 있으니 주의해 주세요."
              : "꺼져 있어요. 사진 없이 관절 좌표로 체형 맵을 다시 볼 수 있어요."}
          </span>
        </span>
        <Switch checked={photos} onCheckedChange={(v) => setRecordSettings({ photos: v })} className="mt-1" aria-label="사진도 함께 기록" />
      </Label>
    </div>
  );
}
