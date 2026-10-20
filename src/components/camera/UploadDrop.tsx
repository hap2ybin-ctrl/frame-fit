"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Notice } from "@/components/flow/Notice";
import { ImageLoadError, loadImageFile, type CapturedPhoto } from "@/lib/image/image";
import type { CaptureView } from "@/lib/pose/quality";
import { cn } from "@/lib/utils";

export function UploadDrop({ view, onLoaded }: { view: CaptureView; onLoaded: (p: CapturedPhoto) => void }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onLoaded(await loadImageFile(file));
    } catch (e) {
      setError(e instanceof ImageLoadError ? e.message : "사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex min-h-72 cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed p-8 text-center transition-colors",
          drag ? "border-ink bg-surface" : "border-neutral-200 hover:border-neutral-400 hover:bg-surface",
        )}
      >
        {busy ? <Loader2 className="size-8 animate-spin" aria-hidden /> : <ImagePlus className="size-8" aria-hidden />}
        <span className="text-base font-semibold">{view === "front" ? "정면" : "측면"} 전신 사진 선택</span>
        <span className="max-w-xs text-sm text-neutral-500">
          머리부터 발목까지 한 명만 나온 사진을 골라 주세요. 사진은 이 기기 안에서만 처리돼요.
        </span>
        <span className="text-xs text-neutral-400">JPG · PNG · WebP (iPhone HEIC는 Safari에서 지원)</span>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </label>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
