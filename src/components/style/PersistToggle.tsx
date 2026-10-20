"use client";

import { HardDrive } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setPersist, usePreferences } from "@/lib/preferences/store";

/** 취향·코디북을 이 기기(localStorage)에 남길지 선택. 사진·분석 좌표는 포함되지 않음 */
export function PersistToggle() {
  const pref = usePreferences();
  return (
    <Label className="items-start gap-3 font-normal leading-relaxed">
      <Switch
        checked={pref.persist}
        onCheckedChange={(v) => {
          if (!v && !window.confirm("이 기기에 저장된 취향·코디북 사본을 지우고, 지금 탭에만 남길까요?")) return;
          setPersist(v);
        }}
        className="mt-0.5"
      />
      <span className="text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <HardDrive className="size-3.5" aria-hidden /> 취향·코디북을 이 기기에 저장
        </span>
        <span className="block text-xs text-neutral-500">
          {pref.persist
            ? "이 브라우저에 보관 중이에요. 사진과 분석 좌표는 포함되지 않아요."
            : "지금은 이 탭에만 보관돼요. 켜면 다음에 와도 취향·저장한 코디가 유지돼요."}
        </span>
      </span>
    </Label>
  );
}
