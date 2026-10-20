"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, FileText, RotateCcw, Save, Share2, Trash2 } from "lucide-react";
import { QualityBadge } from "@/components/camera/QualityPanel";
import { Notice } from "@/components/flow/Notice";
import { EvidenceAccordion, ScoreBars, TypeHero } from "@/components/result/ResultParts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { composeAnalysisPhoto, type AnalysisPhoto } from "@/lib/export/analysisImage";
import { pngToPdf, renderResultPng } from "@/lib/export/resultImage";
import { downloadBlob } from "@/lib/image/image";
import { saveResult, toSavedResult } from "@/lib/store/saved";
import { clearSession, useHydrated, useSession } from "@/lib/store/session";
import { cn } from "@/lib/utils";

function formatDate(iso: string | null) {
  const d = iso ? new Date(iso) : null;
  return d ? d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
}

export function ResultView() {
  const session = useSession();
  const hydrated = useHydrated();
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // 분석 사진 포함은 매번 사용자가 직접 선택 (기본 꺼짐)
  const [includePhotos, setIncludePhotos] = useState(false);

  if (!hydrated) return <div className="mx-auto mt-10 h-96 w-full max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  const result = session.result;
  if (!result) {
    return (
      <div className="mx-auto mt-10 w-full max-w-3xl space-y-4 px-5 sm:px-8">
        <Notice tone="info" title="아직 결과가 없어요">
          보완 체크를 마치면 결과가 계산돼요. 결과는 이 탭의 세션에만 보관되며 탭을 닫으면 사라져요.
        </Notice>
        <div className="flex flex-wrap gap-2">
          <Link href="/check" className={cn(buttonVariants(), "rounded-full")}>보완 체크로 이동</Link>
          <Link href="/saved" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>저장된 결과 보기</Link>
        </div>
      </div>
    );
  }

  const front = session.analyses.front;
  const side = session.analyses.side;
  const dateText = formatDate(session.resultAt);
  const photoSources = (["front", "side"] as const).filter(
    (v) => session.analyses[v]?.status === "ok" && session.analyses[v]?.landmarks && session.captures[v],
  );
  const withPhotos = includePhotos && photoSources.length > 0;
  const fileBase = withPhotos ? "framefit-result-photo" : "framefit-result";

  /** 결과 카드 PNG. 사진 포함을 선택한 경우에만 분석 사진 합성본을 넣음 */
  async function buildCard(): Promise<Blob> {
    let photos: AnalysisPhoto[] = [];
    if (withPhotos) {
      const composed = await Promise.all(
        photoSources.map((v) => composeAnalysisPhoto(session.captures[v]!.dataUrl, session.analyses[v]!, v === "front" ? "정면" : "측면")),
      );
      photos = composed.filter((p): p is AnalysisPhoto => p !== null);
    }
    return renderResultPng(result!, dateText, { photos });
  }

  async function exportPng() {
    setBusy("png");
    setMsg(null);
    try {
      downloadBlob(await buildCard(), `${fileBase}.png`);
    } catch {
      setMsg({ tone: "error", text: "이미지를 만들지 못했어요. 다른 브라우저로 시도해 주세요." });
    } finally {
      setBusy(null);
    }
  }
  async function exportPdf() {
    setBusy("pdf");
    setMsg(null);
    try {
      downloadBlob(await pngToPdf(await buildCard()), `${fileBase}.pdf`);
    } catch {
      setMsg({ tone: "error", text: "PDF를 만들지 못했어요. PNG 저장을 이용해 주세요." });
    } finally {
      setBusy(null);
    }
  }
  async function share() {
    setBusy("share");
    setMsg(null);
    try {
      const png = await buildCard();
      const file = new File([png], `${fileBase}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "FRAME FIT 결과", text: "골격 유형 경향 (참고용)" });
      } else {
        downloadBlob(png, `${fileBase}.png`);
        setMsg({ tone: "ok", text: "이 브라우저는 파일 공유를 지원하지 않아 이미지로 저장했어요." });
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setMsg({ tone: "error", text: "공유하지 못했어요." });
    } finally {
      setBusy(null);
    }
  }
  function save() {
    try {
      const entry = toSavedResult(result!, session.prefs, session.closet, crypto.randomUUID(), new Date().toISOString());
      saveResult(entry);
      setSaved(entry.id);
      setMsg({ tone: "ok", text: "이 브라우저에 결과 요약을 저장했어요. '내 결과'에서 확인·삭제할 수 있어요." });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-6xl px-5 sm:px-8">
      <p className="font-display text-xs font-semibold tracking-[0.2em] text-neutral-500">STEP 05 · RESULT {dateText && `· ${dateText}`}</p>
      <div className="mt-4">
        <TypeHero result={result} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          <section aria-labelledby="evidence">
            <h2 id="evidence" className="text-xl font-bold tracking-tight">판단 근거</h2>
            <p className="mt-1 text-sm text-neutral-600">사진에서 자동 측정한 근거와 직접 체크한 근거를 나누어 보여 드려요.</p>
            <div className="mt-4">
              <EvidenceAccordion result={result} />
            </div>
          </section>

          <section aria-labelledby="limits">
            <h2 id="limits" className="text-xl font-bold tracking-tight">한계와 참고 사항</h2>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-700">
              {result.limitations.map((l) => (
                <li key={l} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-neutral-400" />
                  {l}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl p-6 ring-1 ring-black/5" aria-labelledby="scores">
            <h2 id="scores" className="font-semibold">유형별 근거</h2>
            <div className="mt-4">
              <ScoreBars result={result} />
            </div>
          </section>

          <section className="rounded-3xl p-6 ring-1 ring-black/5" aria-labelledby="quality">
            <h2 id="quality" className="font-semibold">촬영 품질</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-600">정면</dt>
                <dd><QualityBadge level={front?.status === "ok" && front.quality ? front.quality.level : front ? "poor" : "none"} /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-neutral-600">측면</dt>
                <dd><QualityBadge level={side?.status === "ok" && side.quality ? side.quality.level : side ? "poor" : "none"} /></dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-3xl bg-surface p-6" aria-labelledby="save">
            <h2 id="save" className="font-semibold">저장과 공유</h2>
            <p className="text-sm leading-relaxed text-neutral-600">
              지금 결과는 이 탭의 세션에만 있어요. 저장하면 사진·좌표 없이 유형·근거 요약·스타일 선호만 이 브라우저(localStorage)에 남아요.
            </p>
            <Label className="items-start gap-3 font-normal leading-relaxed">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />
              <span className="text-sm">결과 요약을 이 기기의 브라우저에 저장하는 데 동의해요.</span>
            </Label>
            <Button className="w-full rounded-full" disabled={!consent || !!saved} onClick={save}>
              <Save className="size-4" aria-hidden /> {saved ? "저장됨" : "결과 요약 저장"}
            </Button>
            {photoSources.length > 0 && (
              <Label className="items-start gap-3 border-t border-black/5 pt-4 font-normal leading-relaxed">
                <Checkbox checked={includePhotos} onCheckedChange={(v) => setIncludePhotos(!!v)} className="mt-0.5" />
                <span className="text-sm">
                  분석 사진 포함
                  <span className="block text-xs text-neutral-500">
                    {photoSources.length === 2 ? "정면·측면" : photoSources[0] === "front" ? "정면" : "측면"} 사진에 관절점·측정선·윤곽을 겹쳐 넣어요.
                  </span>
                </span>
              </Label>
            )}
            {withPhotos && (
              <Notice tone="warn">
                신체 사진이 파일에 포함돼요. 다른 사람에게 보내거나 올리기 전에 꼭 확인해 주세요. 사진은 이 기기 안에서만 합성되며 어디로도 전송되지 않아요.
              </Notice>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" className="rounded-full" onClick={exportPng} disabled={!!busy}>
                <Download className="size-4" aria-hidden /> PNG
              </Button>
              <Button variant="outline" className="rounded-full" onClick={exportPdf} disabled={!!busy}>
                <FileText className="size-4" aria-hidden /> PDF
              </Button>
              <Button variant="outline" className="rounded-full" onClick={share} disabled={!!busy}>
                <Share2 className="size-4" aria-hidden /> 공유
              </Button>
            </div>
            {!withPhotos && <p className="text-xs text-neutral-500">내보내는 이미지에는 사진이 포함되지 않아요.</p>}
            {msg && <Notice tone={msg.tone === "ok" ? "ok" : "error"}>{msg.text}</Notice>}
          </section>
        </aside>
      </div>

      <div className="mt-12 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link href="/check" className={cn(buttonVariants({ variant: "ghost" }), "h-11 rounded-full")}>
            <RotateCcw className="size-4" aria-hidden /> 체크 수정
          </Link>
          <Button
            variant="ghost"
            className="h-11 rounded-full text-neutral-600"
            onClick={() => {
              if (window.confirm("이 탭에 있는 사진, 분석 데이터, 결과를 모두 지울까요? 저장한 결과 요약은 유지돼요.")) clearSession();
            }}
          >
            <Trash2 className="size-4" aria-hidden /> 세션 데이터 지우기
          </Button>
        </div>
        <Link href="/style" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-full px-6 text-base")}>
          맞춤 코디 보기 <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
